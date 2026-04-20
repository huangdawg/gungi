import type { Board, Position, Move, Player } from '../types.js'
import { buildMovesTo, inBounds } from '../moveUtils.js'

/**
 * Archer (弓):
 * Tier 1: Bishop up to 2 squares diagonally (capped at 2).
 * Tier 2: Full bishop (unlimited diagonal sliding).
 * Tier 3: Queen (unlimited in any of 8 directions).
 *
 * Sliding piece — stops when it hits an occupied square (capture or stack).
 */
export function getArcherMoves(
  board: Board,
  pos: Position,
  owner: Player,
  tier: number,
): Move[] {
  const moves: Move[] = []

  const diagonals: [number, number][] = [[-1, -1], [-1, 1], [1, -1], [1, 1]]
  const orthogonals: [number, number][] = [[-1, 0], [1, 0], [0, -1], [0, 1]]

  const maxDiag = tier === 1 ? 2 : 9
  const directions = tier === 3 ? [...diagonals, ...orthogonals] : diagonals

  for (const [dr, dc] of directions) {
    const maxSteps = (dr === 0 || dc === 0) ? 9 : maxDiag // orthogonals only on tier 3
    for (let step = 1; step <= maxSteps; step++) {
      const to: Position = {
        row: pos.row + dr * step,
        col: pos.col + dc * step,
      }
      if (!inBounds(board, to)) break

      const options = buildMovesTo(board, pos, to, owner)
      if (options.length === 0) break
      moves.push(...options)

      if (board[to.row]?.[to.col]) break // stop after hitting occupied square
    }
  }

  return moves
}
