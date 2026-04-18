import type { Board, Position, Move, Player } from '../types.js'
import { buildMove, inBounds, canLandOn } from '../moveUtils.js'

/**
 * Spy (忍): Rings of exactly N steps in 8 directions, hopping over anything in between.
 *
 * Tier 1: Exactly 1 step in any of 8 directions (standard king movement range).
 * Tier 2: Exactly 2 steps away in any of 8 directions, hopping over the inner ring.
 * Tier 3: Exactly 3 steps away in any of 8 directions, hopping over inner two rings.
 *
 * For diagonal directions: (±N, ±N).
 * For orthogonal directions: (±N, 0) or (0, ±N).
 *
 * Mutual capture: when Spy captures an enemy, the Spy is also removed.
 * This is handled in engine.ts / applyMove, not here in move generation.
 * The moves generated here are valid targets; the engine marks them as captures.
 */
export function getSpyMoves(
  board: Board,
  pos: Position,
  owner: Player,
  tier: number,
): Move[] {
  const moves: Move[] = []
  const n = tier // 1, 2, or 3

  // 8 directions: the Spy lands at exactly (row ± n, col ± n) or (row ± n, col) or (row, col ± n)
  const targets: [number, number][] = [
    [-n, -n], [-n, 0], [-n,  n],
    [ 0, -n],          [ 0,  n],
    [ n, -n], [ n, 0], [ n,  n],
  ]

  for (const [dr, dc] of targets) {
    const to: Position = { row: pos.row + dr, col: pos.col + dc }
    if (!inBounds(to)) continue
    if (!canLandOn(board, to, owner)) continue
    moves.push(buildMove(board, pos, to, owner))
  }

  return moves
}
