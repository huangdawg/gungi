// ─── Core Enums ──────────────────────────────────────────────────────────────

export type Player = 'black' | 'white'

export type PieceType =
  | 'marshal'     // 帅
  | 'pawn'        // 兵
  | 'general'     // 大
  | 'major'       // 中
  | 'musketeer'   // 筒
  | 'knight'      // 马
  | 'samurai'     // 士
  | 'cannon'      // 炮
  | 'spy'         // 忍
  | 'fortress'    // 岩
  | 'archer'      // 弓

/** Tier = height position within the tower (1-based) */
export type Tier = 1 | 2 | 3

// ─── Board Structures ────────────────────────────────────────────────────────

export interface Piece {
  type: PieceType
  owner: Player
}

/**
 * Tower = stack of pieces at a single cell.
 * index 0 = bottom, last = top (the active/movable piece).
 * Length must be 1..3. Empty cell = null (not empty array).
 */
export type Tower = Piece[]

/**
 * 9×9 board. board[row][col], both 0-indexed.
 * Row 0 = Black's back rank. Row 8 = White's back rank.
 * null = empty square.
 */
export type Board = (Tower | null)[][]

// ─── Position ────────────────────────────────────────────────────────────────

export interface Position {
  row: number // 0-8
  col: number // 0-8
}

// ─── Move ────────────────────────────────────────────────────────────────────

export type MoveType = 'place' | 'move' | 'capture' | 'stack'

export interface Move {
  type: MoveType
  /** The piece type being placed (for 'place' moves) */
  piece?: PieceType
  /** Source position (for move/capture/stack) */
  from?: Position
  /** Destination position (always required) */
  to: Position
  /** Human-readable notation, e.g. "帅e5" or "士d3xe5" */
  notation: string
}

// ─── Player State ─────────────────────────────────────────────────────────────

export interface PlayerState {
  /** Pieces not yet placed on the board, available for deployment */
  reserve: PieceType[]
  /** How many pieces this player has placed total (for phase tracking) */
  placedCount: number
  /** How many of this player's pieces are currently on the board */
  onBoardCount: number
}

// ─── Game Phase ──────────────────────────────────────────────────────────────

/**
 * placement = both players have placed fewer than 15 pieces; only place moves allowed.
 * hybrid    = both players have placed at least 15 pieces; each turn = place OR move.
 */
export type GamePhase = 'placement' | 'hybrid'

export type GameStatus = 'active' | 'checkmate' | 'resigned' | 'draw'

// ─── Game State ──────────────────────────────────────────────────────────────

export interface GameState {
  /** Which rule variant this game is playing under. Defaults to 'normal' when omitted by legacy callers. */
  mode: GameMode
  board: Board
  players: {
    black: PlayerState
    white: PlayerState
  }
  currentPlayer: Player
  /** Phase transitions once BOTH players have placed the mode's placement threshold. */
  phase: GamePhase
  /** Increments after each completed turn */
  turnNumber: number
  gameStatus: GameStatus
  winner: Player | null
}

// Import kept at the bottom so the file's primary export block reads top-to-bottom.
import type { GameMode } from './constants.js'
