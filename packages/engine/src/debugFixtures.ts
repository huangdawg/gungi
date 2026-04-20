// Pre-baked GameState fixtures for debugging — used by both LocalGame and the
// multiplayer debug widget. Pure data, no I/O. Safe to import in any context;
// callers are responsible for gating their use behind a dev-only flag.

import type { GameState, Player, PieceType } from './types.js'
import { createInitialState } from './engine.js'

export type DebugPreset = 'reset' | 'hybrid' | 'near-checkmate'

/**
 * Mid-game state with both sides past mandatory placement.
 *
 * Layout is point-symmetric (rotation through the center) so both players see
 * an identical setup from their own POV:
 *   - Cannons on files g & h at the back rank, as tier-3 towers [pawn, general, cannon]
 *   - Majors two rows forward of the cannons on the same files (rank 7 for black),
 *     leaving rank 8 between them open for maneuver
 *   - Marshal + fortress on files b & c at the back rank
 *   - Two center-support generals on rank 8
 *   - Three pawns on rank 7 directly in front of the marshal block
 *
 * 15 pieces placed per side, leaving 19 in reserve.
 */
export function buildHybridState(): GameState {
  const board: GameState['board'] = Array.from({ length: 9 }, () =>
    Array.from({ length: 9 }, () => null)
  )

  const place = (row: number, col: number, type: PieceType, owner: Player) => {
    board[row]![col] = [{ type, owner }]
  }
  const tower = (row: number, col: number, owner: Player, types: PieceType[]) => {
    board[row]![col] = types.map(type => ({ type, owner }))
  }

  // ── Black (rows 0–2 raw) ──
  // Cannons back-left from black's POV (files g & h = raw cols 6 & 7)
  tower(0, 6, 'black', ['pawn', 'general', 'cannon'])
  tower(0, 7, 'black', ['pawn', 'general', 'cannon'])
  // Majors two rows forward of cannons (rank 7 = raw row 2); gap at rank 8.
  place(2, 6, 'major', 'black')
  place(2, 7, 'major', 'black')
  // Marshal + fortress back-right from black's POV (files b & c).
  place(0, 1, 'fortress', 'black')
  place(0, 2, 'marshal',  'black')
  // Center-support generals.
  place(1, 2, 'general', 'black')
  place(1, 4, 'general', 'black')
  // Pawns on rank 7 directly in front of the marshal block (files b, c, d).
  place(2, 1, 'pawn', 'black')
  place(2, 2, 'pawn', 'black')
  place(2, 3, 'pawn', 'black')

  // ── White — point-symmetric mirror of black: raw (R,C) → (8-R, 8-C) ──
  tower(8, 2, 'white', ['pawn', 'general', 'cannon'])
  tower(8, 1, 'white', ['pawn', 'general', 'cannon'])
  place(6, 2, 'major', 'white')
  place(6, 1, 'major', 'white')
  place(8, 7, 'fortress', 'white')
  place(8, 6, 'marshal',  'white')
  place(7, 6, 'general', 'white')
  place(7, 4, 'general', 'white')
  place(6, 7, 'pawn', 'white')
  place(6, 6, 'pawn', 'white')
  place(6, 5, 'pawn', 'white')

  // Reserves: 15 placed per side (1 marshal, 1 fortress, 4 generals, 2 majors,
  // 2 cannons, 5 pawns). Under normal counts (1m, 9p, 4g, 6m, 2mu, 2k, 2s, 2c,
  // 2sp, 2f, 2a = 34), that leaves 17 in reserve.
  const reserve: PieceType[] = [
    'pawn','pawn','pawn','pawn',
    // 4 generals total; all 4 placed → 0 in reserve
    'major','major','major','major',  // 6 majors total - 2 placed = 4 in reserve
    'musketeer','musketeer',
    'knight','knight',
    'samurai','samurai',
    'spy','spy',
    'fortress',
    'archer','archer',
  ]

  return {
    mode: 'normal',
    board,
    players: {
      black: { reserve: [...reserve], placedCount: 15, onBoardCount: 15 },
      white: { reserve: [...reserve], placedCount: 15, onBoardCount: 15 },
    },
    currentPlayer: 'black',
    phase: 'hybrid',
    turnNumber: 31,
    gameStatus: 'active',
    winner: null,
  }
}

/** Black to move, one slide away from capturing the white marshal at e9. */
export function buildNearCheckmateState(): GameState {
  const board: GameState['board'] = Array.from({ length: 9 }, () =>
    Array.from({ length: 9 }, () => null)
  )

  const place = (row: number, col: number, type: PieceType, owner: Player) => {
    board[row]![col] = [{ type, owner }]
  }

  place(0, 4, 'marshal', 'black')
  place(8, 4, 'marshal', 'white')
  place(3, 4, 'musketeer', 'black')
  place(2, 1, 'pawn', 'black')
  place(6, 7, 'pawn', 'white')
  place(1, 6, 'knight', 'black')
  place(7, 2, 'knight', 'white')

  return {
    mode: 'normal',
    board,
    players: {
      black: { reserve: [], placedCount: 25, onBoardCount: 4 },
      white: { reserve: [], placedCount: 25, onBoardCount: 3 },
    },
    currentPlayer: 'black',
    phase: 'hybrid',
    turnNumber: 51,
    gameStatus: 'active',
    winner: null,
  }
}

/**
 * Mini-mode hybrid preset. 5×5 board, 9 pieces placed per side (the mode's
 * placement threshold) in own home rows. Point-symmetric so both POVs are
 * identical. Center of row 1/3 stays empty so the files through the middle
 * aren't fully clogged at the start of hybrid.
 */
export function buildMiniHybridState(): GameState {
  const board: GameState['board'] = Array.from({ length: 5 }, () =>
    Array.from({ length: 5 }, () => null)
  )
  const place = (row: number, col: number, type: PieceType, owner: Player) => {
    board[row]![col] = [{ type, owner }]
  }

  // Black — rows 0-1 (raw). Marshal center-back, 2 pawns on the wings of row 1.
  place(0, 0, 'musketeer', 'black')
  place(0, 1, 'fortress',  'black')
  place(0, 2, 'marshal',   'black')
  place(0, 3, 'fortress',  'black')
  place(0, 4, 'musketeer', 'black')
  place(1, 0, 'pawn',      'black')
  place(1, 1, 'general',   'black')
  //       (1, 2) empty — keeps the e-file open through hybrid start
  place(1, 3, 'general',   'black')
  place(1, 4, 'pawn',      'black')

  // White — point-symmetric mirror: raw (R,C) → (4-R, 4-C).
  place(4, 4, 'musketeer', 'white')
  place(4, 3, 'fortress',  'white')
  place(4, 2, 'marshal',   'white')
  place(4, 1, 'fortress',  'white')
  place(4, 0, 'musketeer', 'white')
  place(3, 4, 'pawn',      'white')
  place(3, 3, 'general',   'white')
  //       (3, 2) empty — same as black's (1,2)
  place(3, 1, 'general',   'white')
  place(3, 0, 'pawn',      'white')

  // Reserves: 9 placed (1 marshal, 2 pawns, 2 generals, 2 musketeers, 2 fortresses)
  // Mini roster: 1m/6p/3g/2mu/1s/2f/1a = 16 → reserve = 4p + 1g + 1s + 1a = 7 per side
  const reserve: PieceType[] = [
    'pawn','pawn','pawn','pawn',
    'general',
    'samurai',
    'archer',
  ]

  return {
    mode: 'mini',
    board,
    players: {
      black: { reserve: [...reserve], placedCount: 9, onBoardCount: 9 },
      white: { reserve: [...reserve], placedCount: 9, onBoardCount: 9 },
    },
    currentPlayer: 'black',
    phase: 'hybrid',
    turnNumber: 19,
    gameStatus: 'active',
    winner: null,
  }
}

/** Resolve a preset name to a fresh GameState. Mode selects board size + roster. */
export function buildPreset(preset: DebugPreset, mode: import('./constants.js').GameMode = 'normal'): GameState {
  switch (preset) {
    case 'reset':          return createInitialState(mode)
    case 'hybrid':         return mode === 'mini' ? buildMiniHybridState() : buildHybridState()
    // near-checkmate is only defined for normal; callers in mini shouldn't trigger it.
    case 'near-checkmate': return buildNearCheckmateState()
  }
}
