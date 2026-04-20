import type { GameState, Player, GamePhase } from './types.js'
import { MODES } from './constants.js'

/**
 * Determine the correct phase based on both players' placed counts, using the
 * threshold for this game's mode.
 */
export function computePhase(state: GameState): GamePhase {
  const threshold = MODES[state.mode].placementThreshold
  const { black, white } = state.players
  if (black.placedCount >= threshold && white.placedCount >= threshold) {
    return 'hybrid'
  }
  return 'placement'
}

/**
 * Returns whether it is legal for `player` to make a placement move this turn.
 */
export function canPlace(state: GameState, player: Player): boolean {
  if (state.phase === 'hybrid') return true
  return state.players[player].placedCount < MODES[state.mode].placementThreshold
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
