import type { GameState, Position, Move, Player, PieceType } from './types.js'
import { getTopPiece, getTier, buildPlaceMove } from './moveUtils.js'
import { MODES, homeRowsFor } from './constants.js'

import { getMarshalMoves } from './pieces/marshal.js'
import { getPawnMoves } from './pieces/pawn.js'
import { getGeneralMoves } from './pieces/general.js'
import { getMajorMoves } from './pieces/major.js'
import { getMusketeeerMoves } from './pieces/musketeer.js'
import { getKnightMoves } from './pieces/knight.js'
import { getSamuraiMoves } from './pieces/samurai.js'
import { getCannonMoves } from './pieces/cannon.js'
import { getSpyMoves } from './pieces/spy.js'
import { getFortressMoves } from './pieces/fortress.js'
import { getArcherMoves } from './pieces/archer.js'

// ─── Per-Piece Dispatch ───────────────────────────────────────────────────────

export function getPieceMoves(
  state: GameState,
  pos: Position,
): Move[] {
  const tower = state.board[pos.row]?.[pos.col] ?? null
  if (!tower) return []
  const top = getTopPiece(tower)
  if (!top) return []
  if (top.owner !== state.currentPlayer) return []

  const tier = getTier(tower) as 1 | 2 | 3
  const board = state.board
  const owner = top.owner

  switch (top.type) {
    case 'marshal':   return getMarshalMoves(board, pos, owner, tier)
    case 'pawn':      return getPawnMoves(board, pos, owner, tier)
    case 'general':   return getGeneralMoves(board, pos, owner, tier)
    case 'major':     return getMajorMoves(board, pos, owner, tier)
    case 'musketeer': return getMusketeeerMoves(board, pos, owner, tier)
    case 'knight':    return getKnightMoves(board, pos, owner, tier)
    case 'samurai':   return getSamuraiMoves(board, pos, owner, tier)
    case 'cannon':    return getCannonMoves(board, pos, owner, tier)
    case 'spy':       return getSpyMoves(board, pos, owner, tier)
    case 'fortress':  return getFortressMoves(board, pos, owner, tier)
    case 'archer':    return getArcherMoves(board, pos, owner, tier)
  }
}

// ─── All Legal Moves ──────────────────────────────────────────────────────────

/**
 * Returns all legal moves for the current player in the given state.
 * Filters out moves that would leave the current player's Marshal in check.
 */
export function getLegalMoves(state: GameState): Move[] {
  if (state.gameStatus !== 'active') return []

  const player = state.currentPlayer
  const moves: Move[] = []

  // 1. Placement moves (if allowed by phase rules)
  const placeMoves = getPlacementMoves(state, player)
  moves.push(...placeMoves)

  // 2. Board moves (if in hybrid phase, or... placement phase = no board moves)
  if (state.phase === 'hybrid') {
    const size = state.board.length
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const tower = state.board[r]?.[c] ?? null
        if (!tower) continue
        const top = getTopPiece(tower)
        if (!top || top.owner !== player) continue

        const pos: Position = { row: r, col: c }
        const pieceMoves = getPieceMoves(state, pos)
        moves.push(...pieceMoves)
      }
    }
  }

  // No check filter — the Marshal may move into check (or be abandoned to check).
  // A player who leaves their Marshal exposed simply loses on the next capture.
  return moves
}

// ─── Placement Move Generation ────────────────────────────────────────────────

/**
 * Returns all valid placement (drop) moves for a player.
 *
 * Placement zones:
 *   - Placement phase (initial setup): ALL pieces — pawns and non-pawns alike —
 *     must be dropped in the player's own home rows. This keeps the opening
 *     structured and prevents early-turn sneaky pawn drops deep in enemy territory.
 *   - Hybrid phase:
 *       - Pawns: anywhere on the board (empty or stackable friendly).
 *       - Non-pawns: own home rows, OR on top of one of your own pawns anywhere
 *         on the board. The advanced-pawn-as-beachhead rule: pawns you've pushed
 *         forward serve as deployment points for reinforcements.
 *
 * Other constraints (both phases):
 *   - Cannot drop on enemy-occupied squares.
 *   - Cannot stack on a marshal (friendly or enemy).
 *   - Can stack on own fortress (fortress is uncapturable but supports friendly stacks).
 *   - Tower height capped at MAX_TOWER_HEIGHT.
 *   - Must have pieces in reserve; onBoardCount < mode's maxOnBoard.
 *   - Marshal must be the first piece placed.
 */
function getPlacementMoves(state: GameState, player: Player): Move[] {
  const playerState = state.players[player]
  const cfg = MODES[state.mode]
  const size = state.board.length

  // Check if placement is allowed this turn
  if (state.phase === 'placement' && playerState.placedCount >= cfg.placementThreshold) return []
  if (playerState.onBoardCount >= cfg.maxOnBoard) return []

  const reserve = playerState.reserve
  if (reserve.length === 0) return []

  // Marshal must be placed first
  const uniqueTypes: PieceType[] = playerState.placedCount === 0
    ? (reserve.includes('marshal') ? ['marshal'] : [])
    : (Array.from(new Set(reserve)) as PieceType[])

  const homeRows = homeRowsFor(state.mode, player)
  const inHome = (r: number) => homeRows.includes(r)
  const isPlacementPhase = state.phase === 'placement'
  const moves: Move[] = []

  for (const pieceType of uniqueTypes) {
    const isPawn = pieceType === 'pawn'

    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const pos: Position = { row: r, col: c }
        const tower = state.board[r]?.[c] ?? null
        const top = tower ? getTopPiece(tower) : null

        // ── Zone check ──
        if (isPlacementPhase) {
          // Initial setup: everything restricted to home rows.
          if (!inHome(r)) continue
        } else {
          // Hybrid phase.
          if (!isPawn && !inHome(r)) {
            // Non-pawn outside home rows: only legal if landing on an own pawn
            // (the advanced-pawn-as-beachhead rule).
            if (!top || top.owner !== player || top.type !== 'pawn') continue
          }
          // Pawns in hybrid: anywhere (no extra zone check).
        }

        // ── Square/tower state check (unchanged across phases) ──
        if (!tower) {
          moves.push(buildPlaceMove(pieceType, pos))
        } else {
          if (!top) continue
          if (top.owner !== player) continue // cannot place on enemy
          if (top.type === 'marshal') continue // cannot stack on marshal
          // Own fortress is OK — friendly pieces may be dropped on top.
          if (tower.length >= 3) continue // tower full
          moves.push(buildPlaceMove(pieceType, pos))
        }
      }
    }
  }

  return moves
}

// ─── Check Helpers ────────────────────────────────────────────────────────────

/**
 * Apply a move without validation — used internally for check detection.
 * Returns a new GameState after the move (does not switch turns, does not check phase).
 */
export function applyMoveNoValidation(state: GameState, move: Move): GameState {
  // Deep clone board
  const board = cloneBoard(state.board)
  const players = {
    black: { ...state.players.black, reserve: [...state.players.black.reserve] },
    white: { ...state.players.white, reserve: [...state.players.white.reserve] },
  }

  const player = state.currentPlayer

  if (move.type === 'place') {
    const pieceType = move.piece!
    // Remove one instance from reserve
    const idx = players[player].reserve.indexOf(pieceType)
    if (idx !== -1) players[player].reserve.splice(idx, 1)

    const { row, col } = move.to
    if (!board[row]![col]) {
      board[row]![col] = [{ type: pieceType, owner: player }]
    } else {
      board[row]![col]!.push({ type: pieceType, owner: player })
    }
    players[player].placedCount++
    players[player].onBoardCount++
  } else {
    // move / capture / stack
    const from = move.from!
    const to = move.to
    const srcTower = board[from.row]![from.col]!
    const movingPiece = srcTower[srcTower.length - 1]!

    // Remove from source
    srcTower.pop()
    if (srcTower.length === 0) board[from.row]![from.col] = null

    const destTower = board[to.row]![to.col]
    if (!destTower) {
      // Move to empty
      board[to.row]![to.col] = [movingPiece]
    } else {
      const destTop = destTower[destTower.length - 1]!
      if (move.type === 'stack') {
        // Stack: push on top regardless of ownership — no removal
        destTower.push(movingPiece)
      } else {
        // Capture: remove top piece (enemy or self-capture)
        const capturedOwner = destTop.owner
        destTower.pop()
        players[capturedOwner].onBoardCount--

        if (destTower.length === 0) {
          board[to.row]![to.col] = [movingPiece]
        } else {
          destTower.push(movingPiece)
        }

        // Spy mutual capture: spy also removed on ANY capture (friendly or enemy)
        if (movingPiece.type === 'spy') {
          const currentDest = board[to.row]![to.col]!
          currentDest.pop()
          if (currentDest.length === 0) board[to.row]![to.col] = null
          players[player].onBoardCount--
        }
      }
    }
  }

  return {
    ...state,
    board,
    players,
  }
}

// ─── isInCheck ────────────────────────────────────────────────────────────────

/**
 * Returns true if the given player's Marshal is under attack by any opponent piece.
 */
export function isInCheck(state: GameState, player: Player): boolean {
  // Find the Marshal
  const marshalPos = findMarshal(state.board, player)
  if (!marshalPos) return false // no marshal = already captured (shouldn't happen normally)

  // Check if any enemy piece can attack the Marshal position
  const opponent: Player = player === 'black' ? 'white' : 'black'
  const size = state.board.length

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const tower = state.board[r]?.[c] ?? null
      if (!tower) continue
      const top = getTopPiece(tower)
      if (!top || top.owner !== opponent) continue

      // Get this piece's attack squares
      // We need a state-like object where it's the opponent's turn
      const opponentState: GameState = { ...state, currentPlayer: opponent }
      const pieceMoves = getPieceMoves(opponentState, { row: r, col: c })

      for (const m of pieceMoves) {
        if (m.to.row === marshalPos.row && m.to.col === marshalPos.col) {
          if (m.type === 'capture') return true
        }
      }
    }
  }

  return false
}

export function findMarshal(board: GameState['board'], player: Player): Position | null {
  const size = board.length
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const tower = board[r]?.[c] ?? null
      if (!tower) continue
      const top = getTopPiece(tower)
      if (top && top.type === 'marshal' && top.owner === player) {
        return { row: r, col: c }
      }
    }
  }
  return null
}

// ─── Board Clone ──────────────────────────────────────────────────────────────

export function cloneBoard(board: GameState['board']): GameState['board'] {
  return board.map(row =>
    row.map(tower => (tower ? tower.map(p => ({ ...p })) : null))
  )
}
