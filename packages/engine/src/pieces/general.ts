import type { Board, Position, Move, Player } from '../types.js'
import { buildMove, buildMovesTo, inBounds } from '../moveUtils.js'
import { FORWARD_DIRECTION } from '../constants.js'

/**
 * General (大):
 * - Move:    1 square forward OR 1 square backward (vertical only)
 *            Any occupied destination offers stack-or-capture choice.
 * - Capture: 1 square diagonally forward OR 1 square diagonally backward (enemy only)
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

  // Movement squares: forward and backward (orthogonal). Generals never capture
  // orthogonally — only move to empty squares or stack on friendlies. Enemy on
  // the forward/backward square is not a legal target.
  for (const dir of [fwd, -fwd]) {
    const to: Position = { row: pos.row + dir, col: pos.col }
    if (!inBounds(board, to)) continue
    const options = buildMovesTo(board, pos, to, owner)
    moves.push(...options.filter((m) => m.type !== 'capture'))
  }

  // Capture-only squares: diagonally forward and backward (enemy pieces only)
  for (const dir of [fwd, -fwd]) {
    for (const dc of [-1, 1]) {
      const capPos: Position = { row: pos.row + dir, col: pos.col + dc }
      if (!inBounds(board, capPos)) continue
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
