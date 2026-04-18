import type { Board, Position, Move, Player } from '../types.js'
import { buildMove, inBounds, canLandOn } from '../moveUtils.js'
import { FORWARD_DIRECTION } from '../constants.js'

/**
 * General (大):
 * - Move:    1 square forward (orthogonal)
 * - Capture: 1 square diagonally forward
 * Same at all tiers.
 */
export function getGeneralMoves(
  board: Board,
  pos: Position,
  owner: Player,
  _tier: number,
): Move[] {
  const moves: Move[] = []
  const fwd = FORWARD_DIRECTION[owner]

  // Move: 1 forward (no capture — only if destination is empty OR stackable)
  // Capture: 1 diag forward (only if enemy on top)
  // Per rules: General moves to empty/friendly-stack target 1 fwd; captures diag fwd
  // "move" means landing on empty or stacking on friendly
  // "capture" means removing enemy top piece

  const forwardPos: Position = { row: pos.row + fwd, col: pos.col }
  if (inBounds(forwardPos) && canLandOn(board, forwardPos, owner)) {
    const tower = board[forwardPos.row]?.[forwardPos.col] ?? null
    const top = tower ? tower[tower.length - 1] : null
    // General can only use forward move for non-captures
    if (!top || top.owner === owner) {
      moves.push(buildMove(board, pos, forwardPos, owner))
    }
  }

  // Capture: diagonally forward
  for (const dc of [-1, 1]) {
    const capPos: Position = { row: pos.row + fwd, col: pos.col + dc }
    if (!inBounds(capPos)) continue
    const tower = board[capPos.row]?.[capPos.col] ?? null
    if (!tower) continue
    const top = tower[tower.length - 1]
    if (top && top.owner !== owner) {
      // It's an enemy — capture or stack capture
      moves.push(buildMove(board, pos, capPos, owner))
    }
  }

  return moves
}
