import type { Board, Position, Move, Player } from '../types.js'
import { buildMovesTo, inBounds } from '../moveUtils.js'

/**
 * Knight (马):
 * Tier 1: Narrow L-shape only: (±2 rows, ±1 col). Forward AND backward, but NOT (±1 row, ±2 col).
 * Tier 2: Full chess knight — all 8 L-shapes: (±1, ±2) and (±2, ±1).
 * Tier 3: Full chess knight + hop exactly 3 squares orthogonally (rook-like jump, not slide).
 */
export function getKnightMoves(
  board: Board,
  pos: Position,
  owner: Player,
  tier: number,
): Move[] {
  const moves: Move[] = []
  let deltas: [number, number][]

  if (tier === 1) {
    // Narrow L: only (±2 rows, ±1 col) — the "tall" L
    deltas = [
      [-2, -1], [-2, 1],
      [ 2, -1], [ 2, 1],
    ]
  } else {
    // Full chess knight (tier 2+)
    deltas = [
      [-2, -1], [-2, 1],
      [ 2, -1], [ 2, 1],
      [-1, -2], [-1, 2],
      [ 1, -2], [ 1, 2],
    ]
  }

  for (const [dr, dc] of deltas) {
    const to: Position = { row: pos.row + dr, col: pos.col + dc }
    if (!inBounds(board, to)) continue
    moves.push(...buildMovesTo(board, pos, to, owner))
  }

  // Tier 3: additionally hop exactly 3 squares orthogonally
  if (tier === 3) {
    for (const [dr, dc] of [[-3, 0], [3, 0], [0, -3], [0, 3]] as [number, number][]) {
      const to: Position = { row: pos.row + dr, col: pos.col + dc }
      if (!inBounds(board, to)) continue
      moves.push(...buildMovesTo(board, pos, to, owner))
    }
  }

  return moves
}
