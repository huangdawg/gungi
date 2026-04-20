import type { Board, Position, Move, Player } from '../types.js'
import { buildMovesTo, inBounds } from '../moveUtils.js'

/**
 * Samurai (士):
 * Queen movement capped at 3 squares in any direction (8 directions).
 * Same at all tiers.
 *
 * Sliding piece — stops when it hits an occupied square (capture or stack) or after 3 steps.
 */
export function getSamuraiMoves(
  board: Board,
  pos: Position,
  owner: Player,
  _tier: number,
): Move[] {
  const moves: Move[] = []
  const directions = [
    [-1, -1], [-1, 0], [-1, 1],
    [ 0, -1],          [ 0, 1],
    [ 1, -1], [ 1, 0], [ 1, 1],
  ]

  for (const [dr, dc] of directions) {
    for (let step = 1; step <= 3; step++) {
      const to: Position = {
        row: pos.row + dr * step,
        col: pos.col + dc * step,
      }
      if (!inBounds(board, to)) break

      const options = buildMovesTo(board, pos, to, owner)
      if (options.length === 0) break
      moves.push(...options)

      // Stop after hitting any occupied square
      if (board[to.row]?.[to.col]) break
    }
  }

  return moves
}
