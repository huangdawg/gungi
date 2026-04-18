import type { Board, Position, Move, Player } from '../types.js'
import { buildMove, inBounds } from '../moveUtils.js'
import { MAX_TOWER_HEIGHT } from '../constants.js'

/**
 * Fortress (岩):
 * - King movement (1 step in any of 8 directions).
 * - CANNOT capture enemy pieces.
 * - CANNOT be captured (by anyone, including self-capture).
 * - Can only move to empty squares OR stack on friendly towers (if height < 3).
 * Same at all tiers.
 *
 * Fortress immunity is also enforced in applyMove — you cannot target a Fortress.
 */
export function getFortressMoves(
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
    if (!inBounds(to)) continue

    const tower = board[to.row]?.[to.col] ?? null
    if (!tower) {
      // Empty square: can always move there
      moves.push(buildMove(board, pos, to, owner))
    } else {
      const top = tower[tower.length - 1]
      if (top && top.owner === owner && tower.length < MAX_TOWER_HEIGHT) {
        // Friendly tower with room to stack
        moves.push(buildMove(board, pos, to, owner))
      }
      // Cannot move to enemy squares (cannot capture)
    }
  }

  return moves
}
