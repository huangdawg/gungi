import type { Board, Position, Move, Player } from '../types.js'
import { buildMove, inBounds, canLandOn } from '../moveUtils.js'
import { FORWARD_DIRECTION } from '../constants.js'

/**
 * Musketeer (筒):
 * - Move+Capture: any number of squares forward only (like a forward-only rook ray).
 *   No backward, no sideways.
 * Same at all tiers.
 *
 * Sliding piece — stops when it hits an occupied square (capture or stack).
 */
export function getMusketeeerMoves(
  board: Board,
  pos: Position,
  owner: Player,
  _tier: number,
): Move[] {
  const moves: Move[] = []
  const fwd = FORWARD_DIRECTION[owner]

  let r = pos.row + fwd
  const c = pos.col

  while (inBounds({ row: r, col: c })) {
    const to: Position = { row: r, col: c }
    if (!canLandOn(board, to, owner)) break

    const tower = board[r]?.[c] ?? null
    const top = tower ? tower[tower.length - 1] : null

    moves.push(buildMove(board, pos, to, owner))

    // Stop sliding after hitting any occupied square
    if (top) break

    r += fwd
  }

  return moves
}
