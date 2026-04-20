import type { PieceType, Player } from './types.js'

// ─── Game Modes ──────────────────────────────────────────────────────────────

export type GameMode = 'normal' | 'mini'

export interface ModeConfig {
  boardSize: number
  /** Each player must place this many pieces before hybrid begins. */
  placementThreshold: number
  /** Max pieces per player on board at any time. */
  maxOnBoard: number
  /** Depth from own back rank where non-pawns may be dropped. */
  homeDepth: number
  /** Per-piece counts that make up a player's full roster. */
  pieceCounts: Record<PieceType, number>
}

export const NORMAL_MODE: ModeConfig = {
  boardSize: 9,
  placementThreshold: 15,
  maxOnBoard: 22,
  homeDepth: 3,
  pieceCounts: {
    marshal:   1,
    pawn:      9,
    general:   4,   // swapped with major
    major:     6,   // swapped with general
    musketeer: 2,
    knight:    2,
    samurai:   2,
    cannon:    2,
    spy:       2,
    fortress:  2,
    archer:    2,
  },
}

export const MINI_MODE: ModeConfig = {
  boardSize: 5,
  placementThreshold: 9,
  maxOnBoard: 13,
  homeDepth: 2,
  pieceCounts: {
    marshal:   1,
    pawn:      6,
    general:   3,
    major:     0,
    musketeer: 2,
    knight:    0,   // removed — knight is too strong on 5x5
    samurai:   1,
    cannon:    0,
    spy:       0,
    fortress:  2,
    archer:    1,
  },
}

export const MODES: Record<GameMode, ModeConfig> = {
  normal: NORMAL_MODE,
  mini:   MINI_MODE,
}

// ─── Legacy constants (kept for back-compat / tests that don't know about modes) ──

export const BOARD_SIZE = NORMAL_MODE.boardSize
export const MAX_TOWER_HEIGHT = 3
export const PLACEMENT_THRESHOLD = NORMAL_MODE.placementThreshold
export const MAX_ON_BOARD = NORMAL_MODE.maxOnBoard
export const PIECE_COUNTS = NORMAL_MODE.pieceCounts

/** Total pieces per player in the given mode. */
export function totalPiecesPerPlayer(mode: GameMode = 'normal'): number {
  return Object.values(MODES[mode].pieceCounts).reduce((a, b) => a + b, 0)
}
export const TOTAL_PIECES_PER_PLAYER = totalPiecesPerPlayer('normal')

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
 * Row 0 = Black's back rank (home rows 0,1,2 on normal).
 * Row 8 = White's back rank (home rows 6,7,8 on normal).
 */
export const HOME_ROWS: Record<Player, number[]> = {
  black: [0, 1, 2],
  white: [6, 7, 8],
}

/**
 * Compute home rows for a given mode + player. Used for non-pawn drop validation.
 *   normal: black [0,1,2], white [6,7,8]   (homeDepth=3, boardSize=9)
 *   mini:   black [0,1],   white [3,4]     (homeDepth=2, boardSize=5)
 */
export function homeRowsFor(mode: GameMode, player: Player): number[] {
  const { boardSize, homeDepth } = MODES[mode]
  if (player === 'black') return Array.from({ length: homeDepth }, (_, i) => i)
  return Array.from({ length: homeDepth }, (_, i) => boardSize - 1 - i).reverse()
}

/** "Forward" for each player is the direction toward the opponent's back rank */
export const FORWARD_DIRECTION: Record<Player, 1 | -1> = {
  black: 1,   // black moves toward higher row numbers
  white: -1,  // white moves toward lower row numbers
}
