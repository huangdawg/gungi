import type { Board, Position, Move, Player, Tower } from './types.js'
import { MAX_TOWER_HEIGHT, PIECE_KANJI } from './constants.js'

// ─── Board Helpers ────────────────────────────────────────────────────────────

export function inBounds(board: Board, pos: Position): boolean {
  const rows = board.length
  const cols = board[0]?.length ?? 0
  return pos.row >= 0 && pos.row < rows && pos.col >= 0 && pos.col < cols
}

export function getTopPiece(tower: Tower | null) {
  if (!tower || tower.length === 0) return null
  return tower[tower.length - 1] ?? null
}

export function getTier(tower: Tower | null): number {
  if (!tower || tower.length === 0) return 0
  return tower.length
}

/**
 * Can a piece owned by `owner` land on this square at all?
 *   - Enemy fortress:  blocked (fortress is indestructible; no capture, no stack).
 *   - Own fortress:    allowed — friendly pieces may stack on top of it.
 *   - Own marshal:     blocked (cannot stack on / capture your own king).
 *   - Enemy marshal:   allowed here — capture handled in buildMovesTo.
 * Stack vs capture eligibility is refined in buildMovesTo.
 */
export function canLandOn(board: Board, pos: Position, owner: Player): boolean {
  const tower = board[pos.row]?.[pos.col] ?? null
  if (!tower) return true

  const top = tower[tower.length - 1]
  if (!top) return true

  if (top.type === 'fortress' && top.owner !== owner) return false
  if (top.type === 'marshal' && top.owner === owner) return false

  return true
}

// ─── Move Builder ─────────────────────────────────────────────────────────────

/**
 * Build all valid Move options for moving from `from` to `to`.
 * - Empty square  → [move]
 * - Occupied square → [capture] + [stack] when tower height < MAX_TOWER_HEIGHT
 * Returns [] when canLandOn blocks the destination.
 *
 * Use this in piece files instead of buildMove so occupied squares always offer
 * both stack and capture as choices.
 */
export function buildMovesTo(board: Board, from: Position, to: Position, owner: Player): Move[] {
  if (!canLandOn(board, to, owner)) return []

  const destTower = board[to.row]?.[to.col] ?? null

  if (!destTower) {
    return [buildMove(board, from, to, owner)]
  }

  const srcTower = board[from.row]?.[from.col] ?? null
  const srcTop = srcTower ? srcTower[srcTower.length - 1] : null
  const kanji = srcTop ? PIECE_KANJI[srcTop.type] : '?'
  const fn = colLetter(from.col) + (from.row + 1)
  const tn = colLetter(to.col) + (to.row + 1)

  const destTop = destTower[destTower.length - 1]!

  // Own fortress: stack only, no capture (fortress is indestructible, so we
  // never expose a capture option even though canLandOn let us land here).
  if (destTop.type === 'fortress' && destTop.owner === owner) {
    if (destTower.length < MAX_TOWER_HEIGHT) {
      return [{ type: 'stack', from, to, notation: `${kanji}${fn}+${tn}` }]
    }
    return []
  }

  const moves: Move[] = [
    { type: 'capture', from, to, notation: `${kanji}${fn}x${tn}` },
  ]
  // Stacking restrictions: no stacking on marshal (either side) and no stacking
  // past MAX_TOWER_HEIGHT. Enemy can still capture the marshal.
  if (destTop.type !== 'marshal' && destTower.length < MAX_TOWER_HEIGHT) {
    moves.push({ type: 'stack', from, to, notation: `${kanji}${fn}+${tn}` })
  }
  return moves
}

/**
 * Build a Move object from source to destination.
 * Determines move type (move / stack / capture) from board state.
 */
export function buildMove(
  board: Board,
  from: Position,
  to: Position,
  _owner: Player,
): Move {
  const destTower = board[to.row]?.[to.col] ?? null
  const srcTower = board[from.row]?.[from.col] ?? null
  const srcTop = srcTower ? srcTower[srcTower.length - 1] : null

  let type: Move['type']
  if (!destTower) {
    type = 'move'
  } else {
    const destTop = destTower[destTower.length - 1]
    if (destTop && destTop.owner === _owner) {
      type = 'stack'
    } else {
      type = 'capture'
    }
  }

  const kanji = srcTop ? PIECE_KANJI[srcTop.type] : '?'
  const fromNotation = colLetter(from.col) + (from.row + 1)
  const toNotation = colLetter(to.col) + (to.row + 1)
  const captureX = type === 'capture' ? 'x' : '-'
  const notation = `${kanji}${fromNotation}${captureX}${toNotation}`

  return { type, from, to, notation }
}

/**
 * Build a place (drop) move.
 */
export function buildPlaceMove(
  pieceType: import('./types.js').PieceType,
  to: Position,
): Move {
  const kanji = PIECE_KANJI[pieceType]
  const toNotation = colLetter(to.col) + (to.row + 1)
  return {
    type: 'place',
    piece: pieceType,
    to,
    notation: `${kanji}@${toNotation}`,
  }
}

function colLetter(col: number): string {
  return String.fromCharCode(97 + col) // a-i
}
