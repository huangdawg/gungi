import type { Board, Position, Move, Player, Tower } from './types.js'
import { BOARD_SIZE, MAX_TOWER_HEIGHT, PIECE_KANJI } from './constants.js'

// ─── Board Helpers ────────────────────────────────────────────────────────────

export function inBounds(pos: Position): boolean {
  return pos.row >= 0 && pos.row < BOARD_SIZE && pos.col >= 0 && pos.col < BOARD_SIZE
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
 * Can a piece owned by `owner` land on this square?
 * Returns false if:
 * - The square has a Fortress on top (fortress immunity).
 * - The tower would exceed max height when stacking.
 * - Stacking own piece onto a full (height 3) tower.
 * Returns true for:
 * - Empty squares.
 * - Friendly tower with room (height < 3) → stack.
 * - Enemy tower → capture (unless Fortress).
 */
export function canLandOn(board: Board, pos: Position, owner: Player): boolean {
  const tower = board[pos.row]?.[pos.col] ?? null
  if (!tower) return true // empty square

  const top = tower[tower.length - 1]
  if (!top) return true

  // Fortress cannot be captured or self-captured
  if (top.type === 'fortress') return false

  // Dead pawn cannot be captured by anyone (pawn can never move/capture so it's permanent terrain)
  if (top.type === 'pawn' && top.owner !== owner) return false

  if (top.owner === owner) {
    // Friendly top — can stack only if height < 3
    return tower.length < MAX_TOWER_HEIGHT
  }

  // Enemy top — can capture (height of destination doesn't matter for captures)
  return true
}

// ─── Move Builder ─────────────────────────────────────────────────────────────

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
