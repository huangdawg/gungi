import type { PieceType, Player } from './types.js'

// ─── Board Dimensions ────────────────────────────────────────────────────────

export const BOARD_SIZE = 9
export const MAX_TOWER_HEIGHT = 3
export const PLACEMENT_THRESHOLD = 15   // each player must place this many before hybrid
export const MAX_ON_BOARD = 25          // max pieces per player on board at any time

// ─── Piece Counts (per player) ────────────────────────────────────────────────

export const PIECE_COUNTS: Record<PieceType, number> = {
  marshal:    1,
  pawn:       9,
  general:    6,
  major:      4,
  musketeer:  2,
  knight:     2,
  samurai:    2,
  cannon:     2,
  spy:        2,
  fortress:   2,
  archer:     2,
}

/** Total pieces per player = 34 */
export const TOTAL_PIECES_PER_PLAYER = Object.values(PIECE_COUNTS).reduce((a, b) => a + b, 0)

// ─── Kanji Display ────────────────────────────────────────────────────────────

export const PIECE_KANJI: Record<PieceType, string> = {
  marshal:   '帅',
  pawn:      '兵',
  general:   '大',
  major:     '中',
  musketeer: '筒',
  knight:    '马',
  samurai:   '士',
  cannon:    '炮',
  spy:       '忍',
  fortress:  '岩',
  archer:    '弓',
}

// ─── Board Orientation ────────────────────────────────────────────────────────

/**
 * Row 0 = Black's back rank (home rows 0,1,2).
 * Row 8 = White's back rank (home rows 6,7,8).
 */
export const HOME_ROWS: Record<Player, number[]> = {
  black: [0, 1, 2],
  white: [6, 7, 8],
}

/** "Forward" for each player is the direction toward the opponent's back rank */
export const FORWARD_DIRECTION: Record<Player, 1 | -1> = {
  black: 1,   // black moves toward higher row numbers
  white: -1,  // white moves toward lower row numbers
}
