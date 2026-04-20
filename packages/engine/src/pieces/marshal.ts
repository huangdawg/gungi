import type { Board, Position, Move, Player } from '../types.js'
import { buildMovesTo, inBounds } from '../moveUtils.js'

/**
 * Marshal (帅): King movement — 1 step in any of 8 directions at all tiers.
 */
export function getMarshalMoves(
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
    const to: Position = { row: pos.row + dr, col: pos.col + dc }
    if (!inBounds(board, to)) continue
    moves.push(...buildMovesTo(board, pos, to, owner))
  }

  return moves
}
