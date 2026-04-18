/**
 * Check and checkmate detection tests.
 */

import { describe, it, expect } from 'vitest'
import type { GameState, Board, PieceType, Player } from '../src/types.js'
import { createInitialState, applyMove, getLegalMoves } from '../src/engine.js'
import { isInCheck } from '../src/movement.js'
import { isCheckmate } from '../src/check.js'
import { buildPlaceMove } from '../src/moveUtils.js'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeState(
  placements: Array<{ row: number; col: number; type: PieceType; owner: Player; towerHeight?: number }>,
  currentPlayer: Player = 'black',
): GameState {
  const base = createInitialState()
  const board: Board = Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => null))

  for (const p of placements) {
    const height = p.towerHeight ?? 1
    const tower = []
    for (let i = 0; i < height - 1; i++) {
      tower.push({ type: 'pawn' as PieceType, owner: p.owner })
    }
    tower.push({ type: p.type, owner: p.owner })
    board[p.row]![p.col] = tower
  }

  return {
    ...base,
    board,
    currentPlayer,
    phase: 'hybrid',
    gameStatus: 'active',
  }
}

// ─── isInCheck ────────────────────────────────────────────────────────────────

describe('isInCheck', () => {
  it('not in check on empty board (no attackers)', () => {
    const state = makeState([
      { row: 0, col: 4, type: 'marshal', owner: 'black' },
    ])
    expect(isInCheck(state, 'black')).toBe(false)
  })

  it('marshal attacked by rook-moving Cannon tier 2', () => {
    const state = makeState([
      { row: 0, col: 4, type: 'marshal', owner: 'black' },
      { row: 4, col: 4, type: 'cannon', owner: 'white', towerHeight: 2 }, // tier 2 = rook
    ])
    // White cannon tier 2 slides up column 4 — marshal at (0,4) is in check
    expect(isInCheck(state, 'black')).toBe(true)
  })

  it('marshal not in check when path is blocked', () => {
    const state = makeState([
      { row: 0, col: 4, type: 'marshal', owner: 'black' },
      { row: 2, col: 4, type: 'pawn', owner: 'black' }, // friendly blocks
      { row: 4, col: 4, type: 'cannon', owner: 'white', towerHeight: 2 },
    ])
    expect(isInCheck(state, 'black')).toBe(false)
  })

  it('marshal in check from adjacent enemy marshal (king-adjacent)', () => {
    const state = makeState([
      { row: 4, col: 4, type: 'marshal', owner: 'black' },
      { row: 4, col: 5, type: 'marshal', owner: 'white' },
    ], 'white')
    // White marshal at (4,5) can capture black marshal at (4,4) — it's in check range
    expect(isInCheck(state, 'black')).toBe(true)
  })

  it('fortress cannot give check', () => {
    const state = makeState([
      { row: 4, col: 4, type: 'marshal', owner: 'black' },
      { row: 4, col: 5, type: 'fortress', owner: 'white' },
    ], 'white')
    // Fortress cannot capture, so it cannot give check
    expect(isInCheck(state, 'black')).toBe(false)
  })
})

// ─── Checkmate detection ──────────────────────────────────────────────────────

describe('isCheckmate', () => {
  it('not checkmate when legal moves exist', () => {
    const state = makeState([
      { row: 0, col: 4, type: 'marshal', owner: 'black' },
    ])
    expect(isCheckmate(state, 'black')).toBe(false)
  })

  it('checkmate: marshal boxed in with no escape', () => {
    // Black marshal at (0,0). Escape squares: (0,1),(1,0),(1,1).
    // All three blocked by uncapturable white fortresses.
    // White cannon tier 1 at (0,2) attacks (0,0) with a 2-square orthogonal jump west.
    //   Tier-1 cannon jumps EXACTLY 2 squares orthogonally, ignoring what is on (0,1).
    // Black has NO pieces in reserve (cannot stack a blocker on the marshal's tower).
    // → Marshal is in check and has no legal moves → checkmate.
    const base = makeState([
      { row: 0, col: 0, type: 'marshal', owner: 'black' },
      { row: 0, col: 1, type: 'fortress', owner: 'white' }, // immune — blocks (0,1)
      { row: 1, col: 0, type: 'fortress', owner: 'white' }, // immune — blocks (1,0)
      { row: 1, col: 1, type: 'fortress', owner: 'white' }, // immune — blocks (1,1)
      { row: 0, col: 2, type: 'cannon', owner: 'white' },   // tier 1: jumps 2 west → (0,0)
    ])
    // Override black's reserve to empty — no pieces to place/stack as a blocker
    const state: GameState = {
      ...base,
      players: {
        ...base.players,
        black: { ...base.players.black, reserve: [] },
      },
    }
    expect(isInCheck(state, 'black')).toBe(true)
    expect(isCheckmate(state, 'black')).toBe(true)
  })

  it('not checkmate when player can block the check', () => {
    // Black marshal at (0,4), white cannon tier 2 rook at (8,4)
    // Black has a piece at (3,0) that can move to (3,4) to block
    const state = makeState([
      { row: 0, col: 4, type: 'marshal', owner: 'black' },
      { row: 3, col: 0, type: 'samurai', owner: 'black' }, // can slide to (3,4) to block
      { row: 8, col: 4, type: 'cannon', owner: 'white', towerHeight: 2 },
    ])
    expect(isInCheck(state, 'black')).toBe(true)
    expect(isCheckmate(state, 'black')).toBe(false)
  })

  it('all-moves-in-check = checkmate (no stalemate rule)', () => {
    // Even if not currently in check, having no legal moves = checkmate (loss)
    // Hard to construct naturally, so this tests that isCheckmate returns true on 0 legal moves
    // We'll use a state where the player has no pieces and is in placement phase with no reserve
    const state: GameState = {
      ...createInitialState(),
      board: Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => null)),
      players: {
        black: { reserve: [], placedCount: 0, onBoardCount: 0 }, // no pieces at all
        white: { reserve: [], placedCount: 0, onBoardCount: 0 },
      },
      phase: 'hybrid',
      currentPlayer: 'black',
      gameStatus: 'active',
    }
    // Black has no moves at all → isCheckmate returns true
    expect(isCheckmate(state, 'black')).toBe(true)
  })
})

// ─── Move filtering (moves that leave king in check are illegal) ──────────────

describe('Check filtering', () => {
  it('cannot make a move that exposes own marshal to check', () => {
    // Black marshal at (0,4), black samurai at (0,5) blocking
    // White cannon tier 2 rook at (8,5) — if samurai moves away from col 5, marshal is exposed
    // Wait, marshal is at col 4 and cannon at col 5 — let's be precise:
    // Black marshal at (4,4), black pawn at (4,5), white cannon tier 2 at (4,8)
    // If pawn at (4,5) is "on top" and removed, cannon attacks marshal
    // Actually pawn cannot move — let's use a samurai
    const state = makeState([
      { row: 4, col: 4, type: 'marshal', owner: 'black' },
      { row: 4, col: 5, type: 'samurai', owner: 'black' }, // blocking cannon
      { row: 4, col: 8, type: 'cannon', owner: 'white', towerHeight: 2 }, // rook sliding west
    ])
    const moves = getLegalMoves(state)

    // Samurai at (4,5) should NOT be able to move off row 4 col 5 if it exposes marshal
    // Samurai can move to (3,4),(5,4) etc. but any move off the blocking square exposes marshal
    // The samurai can ONLY move while staying on the blocking path between cannon (4,8) and marshal (4,4)
    // i.e., it can only stay in col 5,6,7 row 4 (blocking squares)
    // Actually it can move to (4,6) or (4,7) and still block

    // Moves that leave (4,5) empty AND don't block (4,4)-(4,8) path should be filtered
    const samuraiMoveToRow3 = moves.find(m =>
      m.type !== 'place' && m.from?.row === 4 && m.from?.col === 5 && m.to.row === 3
    )
    // Moving up should expose the marshal — should be filtered out
    expect(samuraiMoveToRow3).toBeUndefined()
  })
})
