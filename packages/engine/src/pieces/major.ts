import type { Board, Position, Move, Player } from '../types.js'
import { buildMove, inBounds, canLandOn } from '../moveUtils.js'
import { FORWARD_DIRECTION } from '../constants.js'

/**
 * Major (中):
 * - Move:    1 square forward OR 1 square backward (vertical only)
 * - Capture: 1 square diagonally forward OR 1 square diagonally backward
 * Same at all tiers.
 */
export function getMajorMoves(
  board: Board,
  pos: Position,
  owner: Player,
  _tier: number,
): Move[] {
  const moves: Move[] = []
  const fwd = FORWARD_DIRECTION[owner]

  // Move squares: straight forward and backward
  for (const dir of [fwd, -fwd]) {
    const to: Position = { row: pos.row + dir, col: pos.col }
    if (!inBounds(to)) continue
    const tower = board[to.row]?.[to.col] ?? null
    const top = tower ? tower[tower.length - 1] : null
    // Only move (no capture) in orthogonal directions
    if (!top || top.owner === owner) {
      if (canLandOn(board, to, owner)) {
        moves.push(buildMove(board, pos, to, owner))
      }
    }
  }

  // Capture squares: diagonally forward and backward
  for (const dir of [fwd, -fwd]) {
    for (const dc of [-1, 1]) {
      const capPos: Position = { row: pos.row + dir, col: pos.col + dc }
      if (!inBounds(capPos)) continue
      const tower = board[capPos.row]?.[capPos.col] ?? null
      if (!tower) continue
      const top = tower[tower.length - 1]
      if (top && top.owner !== owner) {
        moves.push(buildMove(board, pos, capPos, owner))
      }
    }
  }

  return moves
}
