import type { Board, Position, Move, Player } from '../types.js'
import { buildMovesTo, inBounds } from '../moveUtils.js'

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

  // Full Chebyshev ring at distance n: all (dr, dc) where max(|dr|, |dc|) === n
  const targets: [number, number][] = []
  for (let dr = -n; dr <= n; dr++) {
    for (let dc = -n; dc <= n; dc++) {
      if (Math.max(Math.abs(dr), Math.abs(dc)) === n) targets.push([dr, dc])
    }
  }

  for (const [dr, dc] of targets) {
    const to: Position = { row: pos.row + dr, col: pos.col + dc }
    if (!inBounds(board, to)) continue
    moves.push(...buildMovesTo(board, pos, to, owner))
  }

  return moves
}
