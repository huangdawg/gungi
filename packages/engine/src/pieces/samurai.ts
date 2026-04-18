import type { Board, Position, Move, Player } from '../types.js'
import { buildMove, inBounds, canLandOn } from '../moveUtils.js'

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
      if (!inBounds(to)) break
      if (!canLandOn(board, to, owner)) break

      const tower = board[to.row]?.[to.col] ?? null
      const top = tower ? tower[tower.length - 1] : null

      moves.push(buildMove(board, pos, to, owner))

      // Stop after hitting any occupied square
      if (top) break
    }
  }

  return moves
}
