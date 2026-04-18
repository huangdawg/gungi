import type { GameState, Player } from './types.js'
import { isInCheck, getLegalMoves } from './movement.js'

export { isInCheck }

/**
 * Returns true if the given player is in checkmate:
 * - Their Marshal is in check, AND
 * - They have no legal move that gets out of check.
 *
 * Per game rules: all-moves-in-check = loss (no stalemate).
 * Even if not currently in check, having no legal moves = checkmate (loss).
 */
export function isCheckmate(state: GameState, player: Player): boolean {
  // Get all legal moves — getLegalMoves already filters moves that leave Marshal in check
  const legalMoves = getLegalMoves({ ...state, currentPlayer: player })
  return legalMoves.length === 0
}
