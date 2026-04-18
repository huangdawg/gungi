import type { Board, Position, Move, Player } from '../types.js'

/**
 * Pawn (兵): Cannot move or capture at any tier.
 * A pawn may be a "dead pawn" (permanently stuck) but generates zero moves.
 */
export function getPawnMoves(
  _board: Board,
  _pos: Position,
  _owner: Player,
  _tier: number,
): Move[] {
  return []
}
