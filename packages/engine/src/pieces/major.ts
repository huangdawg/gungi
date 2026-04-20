import type { Board, Position, Move, Player } from '../types.js'
import { buildMove, buildMovesTo, inBounds } from '../moveUtils.js'
import { FORWARD_DIRECTION } from '../constants.js'

/**
 * Major (中):
 * - Move:    1 square forward (orthogonal)
 *            Any occupied destination offers stack-or-capture choice.
 * - Capture: 1 square diagonally forward (enemy only)
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

  // Movement square: 1 forward (orthogonal). Majors never capture orthogonally —
  // only move to empty or stack on friendly. Enemy directly ahead is not a legal
  // target; captures happen only via the diagonal below.
  const forwardPos: Position = { row: pos.row + fwd, col: pos.col }
  if (inBounds(board, forwardPos)) {
    const options = buildMovesTo(board, pos, forwardPos, owner)
    moves.push(...options.filter((m) => m.type !== 'capture'))
  }

  // Capture-only squares: diagonally forward (enemy pieces only)
  for (const dc of [-1, 1]) {
    const capPos: Position = { row: pos.row + fwd, col: pos.col + dc }
    if (!inBounds(board, capPos)) continue
    const tower = board[capPos.row]?.[capPos.col] ?? null
    if (!tower) continue
    const top = tower[tower.length - 1]
    if (top && top.owner !== owner) {
      moves.push(buildMove(board, pos, capPos, owner))
    }
  }

  return moves
}
