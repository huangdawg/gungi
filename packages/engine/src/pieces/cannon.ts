import type { Board, Position, Move, Player } from '../types.js'
import { buildMove, inBounds, canLandOn } from '../moveUtils.js'

/**
 * Cannon (炮):
 * Tier 1: Move+Capture: exactly 2 squares orthogonally (no sliding, no diagonals).
 *         The intermediate square is irrelevant (can jump).
 * Tier 2: Full rook — any number of squares orthogonally (sliding).
 * Tier 3: Chinese cannon — moves to empty squares like a rook, but captures by
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

/** Tier 1: jump exactly 2 squares orthogonally */
function getCannonTier1Moves(board: Board, pos: Position, owner: Player): Move[] {
  const moves: Move[] = []
  for (const [dr, dc] of [[-2, 0], [2, 0], [0, -2], [0, 2]] as [number, number][]) {
    const to: Position = { row: pos.row + dr, col: pos.col + dc }
    if (!inBounds(to)) continue
    if (!canLandOn(board, to, owner)) continue
    moves.push(buildMove(board, pos, to, owner))
  }
  return moves
}

/** Tier 2: full rook sliding */
function getCannonTier2Moves(board: Board, pos: Position, owner: Player): Move[] {
  const moves: Move[] = []
  for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as [number, number][]) {
    for (let step = 1; step < 9; step++) {
      const to: Position = { row: pos.row + dr * step, col: pos.col + dc * step }
      if (!inBounds(to)) break
      if (!canLandOn(board, to, owner)) break

      const tower = board[to.row]?.[to.col] ?? null
      const top = tower ? tower[tower.length - 1] : null

      moves.push(buildMove(board, pos, to, owner))
      if (top) break // stop after hitting occupied square
    }
  }
  return moves
}

/**
 * Tier 3: Chinese cannon
 * - To empty squares: moves like rook (slides through empty squares, stops before occupied).
 * - To capture: must have exactly 1 intervening piece (the "platform") between cannon and target.
 *   Platform can be ANY piece including dead pawns.
 */
function getCannonTier3Moves(board: Board, pos: Position, owner: Player): Move[] {
  const moves: Move[] = []

  for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as [number, number][]) {
    let platformFound = false

    for (let step = 1; step < 9; step++) {
      const to: Position = { row: pos.row + dr * step, col: pos.col + dc * step }
      if (!inBounds(to)) break

      const tower = board[to.row]?.[to.col] ?? null
      const top = tower ? tower[tower.length - 1] : null

      if (!platformFound) {
        if (!top) {
          // Empty square: can move here
          moves.push(buildMove(board, pos, to, owner))
        } else {
          // First occupied square encountered = platform piece
          platformFound = true
          // Cannot land on the platform piece itself (no move/stack to platform)
        }
      } else {
        // After platform: look for first occupied square = target
        if (!top) continue // skip empty squares after platform

        // Found target: can capture if enemy (or self-capture)
        if (canLandOn(board, to, owner)) {
          moves.push(buildMove(board, pos, to, owner))
        }
        break // stop looking in this direction after first post-platform piece
      }
    }
  }

  return moves
}
