import type { GameState, Player, GamePhase } from './types.js'
import { PLACEMENT_THRESHOLD } from './constants.js'

/**
 * Determine the correct phase based on both players' placed counts.
 * placement = at least one player has placed fewer than PLACEMENT_THRESHOLD pieces.
 * hybrid    = both players have placed >= PLACEMENT_THRESHOLD pieces.
 */
export function computePhase(state: GameState): GamePhase {
  const { black, white } = state.players
  if (black.placedCount >= PLACEMENT_THRESHOLD && white.placedCount >= PLACEMENT_THRESHOLD) {
    return 'hybrid'
  }
  return 'placement'
}

/**
 * Returns whether it is legal for `player` to make a placement move this turn.
 * In placement phase: only if this player's placedCount < PLACEMENT_THRESHOLD.
 * In hybrid phase: always (if pieces in reserve and board room — checked elsewhere).
 */
export function canPlace(state: GameState, player: Player): boolean {
  if (state.phase === 'hybrid') return true
  return state.players[player].placedCount < PLACEMENT_THRESHOLD
}

/**
 * Returns whether it is legal for `player` to make a board move this turn.
 * Only allowed in hybrid phase.
 */
export function canMove(state: GameState): boolean {
  return state.phase === 'hybrid'
}

/**
 * After a move is applied, determine whose turn is next.
 */
export function nextPlayer(current: Player): Player {
  return current === 'black' ? 'white' : 'black'
}
