/**
 * Phase tests: placement phase, hybrid phase transitions, placement validation.
 */

import { describe, it, expect } from 'vitest'
import type { GameState, PieceType, Player } from '../src/types.js'
import { createInitialState, applyMove } from '../src/engine.js'
import { getLegalMoves } from '../src/movement.js'
import { buildPlaceMove } from '../src/moveUtils.js'

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Place N pieces for a player, bypassing turn enforcement by forcing currentPlayer.
 * Tries all valid squares in order until it finds one that works.
 */
function placeNPieces(state: GameState, player: Player, n: number): GameState {
  let s = state
  for (let i = 0; i < n; i++) {
    // Always pick first piece from reserve
    const pieceType = s.players[player].reserve[0]!
    let placed = false

    // Try every square on the board until we find a valid placement
    outer: for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const move = buildPlaceMove(pieceType, { row: r, col: c })
        const result = applyMove({ ...s, currentPlayer: player }, move)
        if (result.ok) {
          // Restore the player (applyMove switches turns)
          s = { ...result.state, currentPlayer: player }
          placed = true
          break outer
        }
      }
    }
    if (!placed) throw new Error(`Could not place piece ${i} (${pieceType}) for ${player}`)
  }
  return s
}

/**
 * Advance both players to hybrid phase by placing 15 pieces each.
 */
function toHybridPhase(): GameState {
  let state = createInitialState()
  state = placeNPieces(state, 'black', 15)
  state = placeNPieces(state, 'white', 15)
  return state
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('Initial state', () => {
  it('starts in placement phase', () => {
    const state = createInitialState()
    expect(state.phase).toBe('placement')
    expect(state.currentPlayer).toBe('black')
    expect(state.turnNumber).toBe(1)
    expect(state.gameStatus).toBe('active')
  })

  it('both players have 34 pieces in reserve', () => {
    const state = createInitialState()
    expect(state.players.black.reserve.length).toBe(34)
    expect(state.players.white.reserve.length).toBe(34)
    expect(state.players.black.placedCount).toBe(0)
    expect(state.players.white.placedCount).toBe(0)
  })

  it('board is entirely empty', () => {
    const state = createInitialState()
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        expect(state.board[r]![c]).toBeNull()
      }
    }
  })
})

describe('Placement phase rules', () => {
  it('non-pawn pieces can only be placed in own first 3 rows (black = rows 0,1,2)', () => {
    const state = createInitialState()
    const moves = getLegalMoves(state)

    // All non-pawn placement moves should be in rows 0,1,2 for black
    const nonPawnPlacements = moves.filter(m => m.type === 'place' && m.piece !== 'pawn')
    expect(nonPawnPlacements.length).toBeGreaterThan(0)
    for (const m of nonPawnPlacements) {
      expect(m.to.row).toBeLessThanOrEqual(2)
    }
  })

  it('pawns can be placed anywhere on the board', () => {
    const state = createInitialState()
    const moves = getLegalMoves(state)

    const pawnPlacements = moves.filter(m => m.type === 'place' && m.piece === 'pawn')
    // Should have pawn placements in rows beyond row 2
    const hasFarRow = pawnPlacements.some(m => m.to.row > 2)
    expect(hasFarRow).toBe(true)
  })

  it('pawn cannot be placed in a file with an existing friendly pawn', () => {
    let state = createInitialState()

    // Place a black pawn at (0,4)
    const placePawn = buildPlaceMove('pawn', { row: 0, col: 4 })
    const result = applyMove(state, placePawn)
    expect(result.ok).toBe(true)
    state = (result as { ok: true; state: GameState }).state

    // Override to black's turn to check black's moves
    state = { ...state, currentPlayer: 'black' }
    const moves = getLegalMoves(state)

    // Black should not be able to place another pawn in column 4
    const col4PawnPlacements = moves.filter(m =>
      m.type === 'place' && m.piece === 'pawn' && m.to.col === 4
    )
    expect(col4PawnPlacements).toHaveLength(0)
  })

  it('white home rows are rows 6,7,8', () => {
    const state = { ...createInitialState(), currentPlayer: 'white' as Player }
    const moves = getLegalMoves(state)

    const nonPawnPlacements = moves.filter(m => m.type === 'place' && m.piece !== 'pawn')
    expect(nonPawnPlacements.length).toBeGreaterThan(0)
    for (const m of nonPawnPlacements) {
      expect(m.to.row).toBeGreaterThanOrEqual(6)
    }
  })
})

describe('Phase transition: placement → hybrid', () => {
  it('stays in placement phase until both players reach 15 placed', () => {
    let state = createInitialState()

    // Black places 15
    state = placeNPieces(state, 'black', 15)
    expect(state.players.black.placedCount).toBe(15)
    // Phase still placement because white hasn't placed 15 yet
    expect(state.phase).toBe('placement')
  })

  it('transitions to hybrid once BOTH players have placed 15', () => {
    const state = toHybridPhase()
    expect(state.phase).toBe('hybrid')
    expect(state.players.black.placedCount).toBe(15)
    expect(state.players.white.placedCount).toBe(15)
  })

  it('in hybrid phase, board moves are allowed', () => {
    const hybridState = { ...toHybridPhase(), currentPlayer: 'black' as Player }
    const moves = getLegalMoves(hybridState)

    // Should have both place and move options
    const hasPlaceMoves = moves.some(m => m.type === 'place')
    const hasBoardMoves = moves.some(m => m.type === 'move' || m.type === 'capture' || m.type === 'stack')
    expect(hasPlaceMoves).toBe(true)
    expect(hasBoardMoves).toBe(true)
  })

  it('in placement phase, board moves are not allowed', () => {
    let state = createInitialState()
    // Place a piece for black so there's something to potentially move
    const result = applyMove(state, buildPlaceMove('marshal', { row: 0, col: 0 }))
    expect(result.ok).toBe(true)
    state = (result as { ok: true; state: GameState }).state
    // Force back to black's turn — still in placement phase
    state = { ...state, currentPlayer: 'black' }
    const moves = getLegalMoves(state)
    const boardMoves = moves.filter(m => m.type === 'move' || m.type === 'capture')
    expect(boardMoves).toHaveLength(0)
  })
})

describe('Max 25 pieces on board', () => {
  it('cannot place more than 25 pieces on board at once', () => {
    // First get both players to hybrid phase (15 each on board)
    let state = toHybridPhase()
    // Now force black to place 10 more (total 25)
    state = placeNPieces({ ...state, currentPlayer: 'black' }, 'black', 10)
    expect(state.players.black.onBoardCount).toBe(25)

    // Now placement moves for black should be blocked by onBoardCount limit
    const moves = getLegalMoves({ ...state, currentPlayer: 'black' })
    const placeMoves = moves.filter(m => m.type === 'place')
    expect(placeMoves).toHaveLength(0)
  })
})
