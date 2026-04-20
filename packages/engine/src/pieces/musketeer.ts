import type { Board, Position, Move, Player } from '../types.js'
import { buildMovesTo, inBounds } from '../moveUtils.js'
import { FORWARD_DIRECTION } from '../constants.js'

/**
 * Musketeer (筒):
 * - Forward: slides any number of squares (stops on occupied, stack-or-capture offered).
 * - Backward: 1 square diagonally (backward-left or backward-right).
 * Same at all tiers.
 */
export function getMusketeeerMoves(
  board: Board,
  pos: Position,
  owner: Player,
  _tier: number,
): Move[] {
  const moves: Move[] = []
  const fwd = FORWARD_DIRECTION[owner]

  // Forward slide
  let r = pos.row + fwd
  const c = pos.col
  while (inBounds(board, { row: r, col: c })) {
    const to: Position = { row: r, col: c }
    const options = buildMovesTo(board, pos, to, owner)
    if (options.length === 0) break
    moves.push(...options)
    if (board[r]?.[c]) break
    r += fwd
  }

  // Backward diagonals — 1 square
  for (const dc of [-1, 1]) {
    const to: Position = { row: pos.row - fwd, col: pos.col + dc }
    if (!inBounds(board, to)) continue
    moves.push(...buildMovesTo(board, pos, to, owner))
  }

  return moves
}
