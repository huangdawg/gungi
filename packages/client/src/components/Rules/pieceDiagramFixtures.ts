import type { GameState, PieceType, Piece } from '@gungi/engine'
import { getLegalMoves } from '@gungi/engine'

/**
 * Piece diagram fixtures: probe the real rule engine to derive which squares a
 * given piece can reach from the center of a 9x9 board at a given tier. The
 * returned sets drive the visual markers in <PieceDiagram>.
 *
 * We use the engine (not hand-rolled movement tables) so that diagrams cannot
 * drift if rules change — they regenerate from the authoritative source.
 */

const BOARD_SIZE = 9
const CENTER = { row: 4, col: 4 }

type ProbeKind = 'empty' | 'enemy' | 'friendly'

export interface PieceReach {
  /** Cells reachable by moving onto an empty square (key = "row,col"). */
  moves: Set<string>
  /** Cells reachable by capturing an enemy. */
  captures: Set<string>
  /** Cells reachable by stacking on a friendly. */
  stacks: Set<string>
  /** Tier-3 cannon only: (platformCell, jumpTargetCell) pairs. */
  jumps?: Array<{ platform: string; target: string }>
}

const cache = new Map<string, PieceReach>()

export function getPieceReach(pieceType: PieceType, tier: 1 | 2 | 3): PieceReach {
  const key = `${pieceType}:${tier}`
  const hit = cache.get(key)
  if (hit) return hit

  const reach: PieceReach = {
    moves: new Set<string>(),
    captures: new Set<string>(),
    stacks: new Set<string>(),
  }

  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (r === CENTER.row && c === CENTER.col) continue
      const cellKey = `${r},${c}`

      const s1 = buildProbeState(pieceType, tier, r, c, 'empty')
      for (const m of getLegalMoves(s1)) {
        if (!m.from) continue
        if (m.from.row !== CENTER.row || m.from.col !== CENTER.col) continue
        if (m.to.row !== r || m.to.col !== c) continue
        if (m.type === 'move') reach.moves.add(cellKey)
      }

      const s2 = buildProbeState(pieceType, tier, r, c, 'enemy')
      for (const m of getLegalMoves(s2)) {
        if (!m.from) continue
        if (m.from.row !== CENTER.row || m.from.col !== CENTER.col) continue
        if (m.to.row !== r || m.to.col !== c) continue
        if (m.type === 'capture') reach.captures.add(cellKey)
      }

      const s3 = buildProbeState(pieceType, tier, r, c, 'friendly')
      for (const m of getLegalMoves(s3)) {
        if (!m.from) continue
        if (m.from.row !== CENTER.row || m.from.col !== CENTER.col) continue
        if (m.to.row !== r || m.to.col !== c) continue
        if (m.type === 'stack') reach.stacks.add(cellKey)
      }
    }
  }

  if (pieceType === 'cannon' && tier === 3) {
    reach.jumps = computeCannonJumps()
  }

  cache.set(key, reach)
  return reach
}

/**
 * Constructs a minimal GameState with the subject piece on top of a tower at
 * center, and an optional probe at (r,c). Everything else empty. phase='game'
 * so getLegalMoves returns board moves.
 */
function buildProbeState(
  pieceType: PieceType,
  tier: number,
  targetRow: number,
  targetCol: number,
  targetKind: ProbeKind,
): GameState {
  const board: GameState['board'] = Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => null),
  )

  const subjectTower: Piece[] = []
  for (let i = 0; i < tier - 1; i++) {
    subjectTower.push({ type: 'pawn', owner: 'black' })
  }
  subjectTower.push({ type: pieceType, owner: 'black' })
  board[CENTER.row]![CENTER.col] = subjectTower

  if (targetKind === 'enemy') {
    board[targetRow]![targetCol] = [{ type: 'pawn', owner: 'white' }]
  } else if (targetKind === 'friendly') {
    board[targetRow]![targetCol] = [{ type: 'pawn', owner: 'black' }]
  }

  const friendlyOnBoard = tier + (targetKind === 'friendly' ? 1 : 0)
  const enemyOnBoard = targetKind === 'enemy' ? 1 : 0

  return {
    mode: 'normal',
    board,
    players: {
      black: { reserve: [], placedCount: 15, onBoardCount: friendlyOnBoard },
      white: { reserve: [], placedCount: 15, onBoardCount: enemyOnBoard },
    },
    currentPlayer: 'black',
    phase: 'game',
    turnNumber: 30,
    gameStatus: 'active',
    winner: null,
  }
}

/**
 * Tier-3 cannon: for each orthogonal direction, enumerate (platform-distance,
 * target-distance) pairs where `target-distance > platform-distance` and both
 * are in-bounds, and confirm via the engine that the jump-capture is legal.
 *
 * Returned pairs drive an annotated "jump capture" overlay in the diagram.
 */
function computeCannonJumps(): Array<{ platform: string; target: string }> {
  const results: Array<{ platform: string; target: string }> = []
  const dirs: Array<[number, number]> = [[-1, 0], [1, 0], [0, -1], [0, 1]]

  for (const [dr, dc] of dirs) {
    for (let p = 1; p < BOARD_SIZE; p++) {
      const pr = CENTER.row + dr * p
      const pc = CENTER.col + dc * p
      if (pr < 0 || pr >= BOARD_SIZE || pc < 0 || pc >= BOARD_SIZE) break
      for (let t = p + 1; t < BOARD_SIZE; t++) {
        const tr = CENTER.row + dr * t
        const tc = CENTER.col + dc * t
        if (tr < 0 || tr >= BOARD_SIZE || tc < 0 || tc >= BOARD_SIZE) break

        const board: GameState['board'] = Array.from({ length: BOARD_SIZE }, () =>
          Array.from({ length: BOARD_SIZE }, () => null),
        )
        board[CENTER.row]![CENTER.col] = [
          { type: 'pawn', owner: 'black' },
          { type: 'pawn', owner: 'black' },
          { type: 'cannon', owner: 'black' },
        ]
        board[pr]![pc] = [{ type: 'pawn', owner: 'white' }]
        board[tr]![tc] = [{ type: 'pawn', owner: 'white' }]

        const state: GameState = {
          mode: 'normal',
          board,
          players: {
            black: { reserve: [], placedCount: 15, onBoardCount: 3 },
            white: { reserve: [], placedCount: 15, onBoardCount: 2 },
          },
          currentPlayer: 'black',
          phase: 'game',
          turnNumber: 30,
          gameStatus: 'active',
          winner: null,
        }

        for (const m of getLegalMoves(state)) {
          if (!m.from || m.type !== 'capture') continue
          if (m.from.row !== CENTER.row || m.from.col !== CENTER.col) continue
          if (m.to.row === tr && m.to.col === tc) {
            results.push({ platform: `${pr},${pc}`, target: `${tr},${tc}` })
          }
        }
      }
    }
  }

  return results
}
