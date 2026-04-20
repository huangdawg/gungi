import type { Board, Position, Move, Player } from '../types.js'
import { buildMove, buildMovesTo, inBounds } from '../moveUtils.js'

/**
 * Cannon (炮):
 * Tier 1: Move+Capture: exactly 2 squares orthogonally (no sliding, no diagonals).
 *         The intermediate square is irrelevant (can jump).
 * Tier 2: Full rook — any number of squares orthogonally (sliding).
 * Tier 3: Chinese cannon — moves to empty squares like a rook, but attacks by
 *         jumping over exactly 1 intervening piece (including dead pawns).
 *
 * Dead pawns count as valid "platform" pieces for the Tier 3 jump.
 */
export function getCannonMoves(
  board: Board,
  pos: Position,
  owner: Player,
  tier: number,
): Move[] {
  if (tier === 1) return getCannonTier1Moves(board, pos, owner)
  if (tier === 2) return getCannonTier2Moves(board, pos, owner)
  return getCannonTier3Moves(board, pos, owner)
}

/** Tier 1: rook slide, capped at 2 squares, stops on any occupied square */
function getCannonTier1Moves(board: Board, pos: Position, owner: Player): Move[] {
  const moves: Move[] = []
  for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as [number, number][]) {
    for (let step = 1; step <= 2; step++) {
      const to: Position = { row: pos.row + dr * step, col: pos.col + dc * step }
      if (!inBounds(board, to)) break

      const options = buildMovesTo(board, pos, to, owner)
      if (options.length === 0) break
      moves.push(...options)
      if (board[to.row]?.[to.col]) break // stop after hitting occupied
    }
  }
  return moves
}

/** Tier 2: full rook sliding */
function getCannonTier2Moves(board: Board, pos: Position, owner: Player): Move[] {
  const moves: Move[] = []
  for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as [number, number][]) {
    for (let step = 1; step < board.length; step++) {
      const to: Position = { row: pos.row + dr * step, col: pos.col + dc * step }
      if (!inBounds(board, to)) break

      const options = buildMovesTo(board, pos, to, owner)
      if (options.length === 0) break
      moves.push(...options)
      if (board[to.row]?.[to.col]) break // stop after hitting occupied square
    }
  }
  return moves
}

/**
 * Tier 3: Rook + Chinese cannon.
 * - Empty squares: rook slide.
 * - First occupied piece in a direction: rook-style stack-or-capture at that square,
 *   AND the piece also acts as a "platform" allowing a jump to the next piece in line.
 * - Post-platform: skips empties, then offers stack-or-capture on the next piece.
 */
function getCannonTier3Moves(board: Board, pos: Position, owner: Player): Move[] {
  const moves: Move[] = []

  for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as [number, number][]) {
    let platformFound = false

    for (let step = 1; step < board.length; step++) {
      const to: Position = { row: pos.row + dr * step, col: pos.col + dc * step }
      if (!inBounds(board, to)) break

      const tower = board[to.row]?.[to.col] ?? null
      const top = tower ? tower[tower.length - 1] : null

      if (!platformFound) {
        if (!top) {
          // Empty square: rook-style slide
          moves.push(buildMove(board, pos, to, owner))
        } else {
          // First occupied: rook-style target (stack-or-capture) AND platform for jump
          moves.push(...buildMovesTo(board, pos, to, owner))
          platformFound = true
        }
      } else {
        // After platform: skip empties, then offer stack-or-capture on next piece
        if (!top) continue
        moves.push(...buildMovesTo(board, pos, to, owner))
        break
      }
    }
  }

  return moves
}

