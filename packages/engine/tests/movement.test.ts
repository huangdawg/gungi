/**
 * Movement tests: all 11 pieces × 3 tiers.
 * Tests use a helper to create a minimal GameState with pieces placed at specific positions.
 */

import { describe, it, expect } from 'vitest'
import type { GameState, Board, PieceType, Player } from '../src/types.js'
import { getPieceMoves } from '../src/movement.js'
import { createInitialState } from '../src/engine.js'

// ─── Test Helpers ─────────────────────────────────────────────────────────────

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

function getMoveTos(
  state: GameState,
  row: number,
  col: number,
): Array<{ row: number; col: number }> {
  return getPieceMoves(state, { row, col }).map(m => m.to)
}

function expectContains(
  actual: Array<{ row: number; col: number }>,
  expected: Array<[number, number]>,
) {
  for (const [r, c] of expected) {
    expect(actual).toContainEqual({ row: r, col: c })
  }
}

function expectExactly(
  actual: Array<{ row: number; col: number }>,
  expected: Array<[number, number]>,
) {
  expect(actual.length).toBe(expected.length)
  for (const [r, c] of expected) {
    expect(actual).toContainEqual({ row: r, col: c })
  }
}

// ─── Marshal ─────────────────────────────────────────────────────────────────

describe('Marshal', () => {
  it('tier 1 — center: 8 moves', () => {
    const state = makeState([{ row: 4, col: 4, type: 'marshal', owner: 'black' }])
    const tos = getMoveTos(state, 4, 4)
    expectExactly(tos, [
      [3,3],[3,4],[3,5],
      [4,3],      [4,5],
      [5,3],[5,4],[5,5],
    ])
  })

  it('tier 1 — corner: 3 moves', () => {
    const state = makeState([{ row: 0, col: 0, type: 'marshal', owner: 'black' }])
    const tos = getMoveTos(state, 0, 0)
    expectExactly(tos, [[0,1],[1,0],[1,1]])
  })

  it('tier 2 — same as tier 1 (king movement)', () => {
    const state = makeState([{ row: 4, col: 4, type: 'marshal', owner: 'black', towerHeight: 2 }])
    const tos = getMoveTos(state, 4, 4)
    expectExactly(tos, [
      [3,3],[3,4],[3,5],
      [4,3],      [4,5],
      [5,3],[5,4],[5,5],
    ])
  })

  it('tier 3 — same as tier 1 (king movement)', () => {
    const state = makeState([{ row: 4, col: 4, type: 'marshal', owner: 'black', towerHeight: 3 }])
    const tos = getMoveTos(state, 4, 4)
    expectExactly(tos, [
      [3,3],[3,4],[3,5],
      [4,3],      [4,5],
      [5,3],[5,4],[5,5],
    ])
  })

  it('cannot move onto friendly piece (unless stacking)', () => {
    const state = makeState([
      { row: 4, col: 4, type: 'marshal', owner: 'black' },
      { row: 4, col: 5, type: 'pawn', owner: 'black' }, // friendly pawn at height 1, can be stacked
    ])
    const tos = getMoveTos(state, 4, 4)
    // Can stack on friendly pawn (height 1 → 2)
    expect(tos).toContainEqual({ row: 4, col: 5 })
  })

  it('cannot stack on a height-3 friendly tower', () => {
    const state = makeState([
      { row: 4, col: 4, type: 'marshal', owner: 'black' },
      { row: 4, col: 5, type: 'pawn', owner: 'black', towerHeight: 3 }, // full tower
    ])
    const tos = getMoveTos(state, 4, 4)
    expect(tos).not.toContainEqual({ row: 4, col: 5 })
  })
})

// ─── Pawn ─────────────────────────────────────────────────────────────────────

describe('Pawn', () => {
  it('tier 1 — no moves ever', () => {
    const state = makeState([{ row: 4, col: 4, type: 'pawn', owner: 'black' }])
    const tos = getMoveTos(state, 4, 4)
    expect(tos).toHaveLength(0)
  })

  it('tier 2 — no moves ever', () => {
    const state = makeState([{ row: 4, col: 4, type: 'pawn', owner: 'black', towerHeight: 2 }])
    const tos = getMoveTos(state, 4, 4)
    expect(tos).toHaveLength(0)
  })

  it('tier 3 — no moves ever', () => {
    const state = makeState([{ row: 4, col: 4, type: 'pawn', owner: 'black', towerHeight: 3 }])
    const tos = getMoveTos(state, 4, 4)
    expect(tos).toHaveLength(0)
  })
})

// ─── General ─────────────────────────────────────────────────────────────────

describe('General', () => {
  // Black moves toward row 8; forward = +1 row
  it('tier 1 — black: 1 forward + 2 diag forward captures (from center, empty board)', () => {
    const state = makeState([{ row: 4, col: 4, type: 'general', owner: 'black' }])
    const tos = getMoveTos(state, 4, 4)
    // Move: 1 forward = (5,4)
    // Capture targets (5,3) and (5,5) — but only if enemy is there; empty = no capture
    expectExactly(tos, [[5,4]])
  })

  it('tier 1 — black: can capture diag forward enemies', () => {
    const state = makeState([
      { row: 4, col: 4, type: 'general', owner: 'black' },
      { row: 5, col: 3, type: 'pawn', owner: 'white' },
      { row: 5, col: 5, type: 'pawn', owner: 'white' },
    ])
    const tos = getMoveTos(state, 4, 4)
    expectContains(tos, [[5,3],[5,4],[5,5]])
  })

  it('tier 1 — black: cannot capture diag backward', () => {
    const state = makeState([
      { row: 4, col: 4, type: 'general', owner: 'black' },
      { row: 3, col: 3, type: 'pawn', owner: 'white' },
    ])
    const tos = getMoveTos(state, 4, 4)
    expect(tos).not.toContainEqual({ row: 3, col: 3 })
  })

  it('tier 1 — white: forward is backward (row -1)', () => {
    const state = makeState([{ row: 4, col: 4, type: 'general', owner: 'white' }], 'white')
    const tos = getMoveTos(state, 4, 4)
    expectExactly(tos, [[3,4]])
  })

  it('tier 2 and 3 — same movement as tier 1', () => {
    for (const h of [2, 3] as const) {
      const state = makeState([{ row: 4, col: 4, type: 'general', owner: 'black', towerHeight: h }])
      const tos = getMoveTos(state, 4, 4)
      expectExactly(tos, [[5,4]])
    }
  })
})

// ─── Major ────────────────────────────────────────────────────────────────────

describe('Major', () => {
  it('tier 1 — black: moves 1 fwd and 1 bwd; captures diag fwd and diag bwd', () => {
    const state = makeState([
      { row: 4, col: 4, type: 'major', owner: 'black' },
      { row: 3, col: 3, type: 'pawn', owner: 'white' }, // diag backward
      { row: 3, col: 5, type: 'pawn', owner: 'white' }, // diag backward
      { row: 5, col: 3, type: 'pawn', owner: 'white' }, // diag forward
      { row: 5, col: 5, type: 'pawn', owner: 'white' }, // diag forward
    ])
    const tos = getMoveTos(state, 4, 4)
    expectContains(tos, [
      [5,4], // 1 forward (move)
      [3,4], // 1 backward (move)
      [3,3],[3,5], // diag backward capture
      [5,3],[5,5], // diag forward capture
    ])
  })

  it('tier 1 — cannot move diagonally (only straight)', () => {
    const state = makeState([{ row: 4, col: 4, type: 'major', owner: 'black' }])
    const tos = getMoveTos(state, 4, 4)
    // Only [5,4] and [3,4] — no diagonal moves to empty squares
    expectExactly(tos, [[5,4],[3,4]])
  })
})

// ─── Musketeer ────────────────────────────────────────────────────────────────

describe('Musketeer', () => {
  it('tier 1 — black: slides forward only, stops at occupied', () => {
    const state = makeState([
      { row: 2, col: 4, type: 'musketeer', owner: 'black' },
    ])
    const tos = getMoveTos(state, 2, 4)
    // Can reach rows 3,4,5,6,7,8 in col 4 (forward = increasing row for black)
    expectContains(tos, [[3,4],[4,4],[5,4],[6,4],[7,4],[8,4]])
    expect(tos).not.toContainEqual({ row: 1, col: 4 }) // backward not allowed
  })

  it('tier 1 — black: stops sliding at enemy (captures), cannot go further', () => {
    const state = makeState([
      { row: 2, col: 4, type: 'musketeer', owner: 'black' },
      { row: 5, col: 4, type: 'general', owner: 'white' }, // non-pawn enemy (capturable)
    ])
    const tos = getMoveTos(state, 2, 4)
    expect(tos).toContainEqual({ row: 5, col: 4 }) // can capture
    expect(tos).not.toContainEqual({ row: 6, col: 4 }) // cannot pass through
  })

  it('all tiers: same movement', () => {
    for (const h of [1, 2, 3] as const) {
      const state = makeState([
        { row: 4, col: 4, type: 'musketeer', owner: 'black', towerHeight: h },
      ])
      const tos = getMoveTos(state, 4, 4)
      expectContains(tos, [[5,4],[6,4],[7,4],[8,4]])
    }
  })
})

// ─── Knight ──────────────────────────────────────────────────────────────────

describe('Knight', () => {
  it('tier 1 — narrow L only: (±2, ±1)', () => {
    const state = makeState([{ row: 4, col: 4, type: 'knight', owner: 'black' }])
    const tos = getMoveTos(state, 4, 4)
    expectExactly(tos, [
      [2,3],[2,5],
      [6,3],[6,5],
    ])
    // Should NOT include wide L: (±1, ±2)
    expect(tos).not.toContainEqual({ row: 3, col: 2 })
    expect(tos).not.toContainEqual({ row: 3, col: 6 })
  })

  it('tier 2 — full chess knight: all 8 L-shapes', () => {
    const state = makeState([{ row: 4, col: 4, type: 'knight', owner: 'black', towerHeight: 2 }])
    const tos = getMoveTos(state, 4, 4)
    expectExactly(tos, [
      [2,3],[2,5],
      [6,3],[6,5],
      [3,2],[3,6],
      [5,2],[5,6],
    ])
  })

  it('tier 3 — full knight + 3-square orthogonal hops', () => {
    const state = makeState([{ row: 4, col: 4, type: 'knight', owner: 'black', towerHeight: 3 }])
    const tos = getMoveTos(state, 4, 4)
    // All 8 knight moves
    expectContains(tos, [
      [2,3],[2,5],[6,3],[6,5],
      [3,2],[3,6],[5,2],[5,6],
    ])
    // Plus 4 orthogonal 3-square hops
    expectContains(tos, [[1,4],[7,4],[4,1],[4,7]])
  })
})

// ─── Samurai ─────────────────────────────────────────────────────────────────

describe('Samurai', () => {
  it('tier 1 — center: queen movement capped at 3 in all 8 directions', () => {
    const state = makeState([{ row: 4, col: 4, type: 'samurai', owner: 'black' }])
    const tos = getMoveTos(state, 4, 4)
    // Should have exactly 3 squares in each of 8 directions (some cut by board edge)
    expectContains(tos, [
      [3,4],[2,4],[1,4], // north
      [5,4],[6,4],[7,4], // south
      [4,3],[4,2],[4,1], // west
      [4,5],[4,6],[4,7], // east
      [3,3],[2,2],[1,1], // NW
      [3,5],[2,6],[1,7], // NE
      [5,3],[6,2],[7,1], // SW
      [5,5],[6,6],[7,7], // SE
    ])
    // Should NOT reach row 0 or col 0 from center (4 steps away)
    // Distance from (4,4) to (0,0) = 4 steps; Samurai capped at 3
    // Actually (1,1) is 3 steps away — should be reachable
    expect(tos).toContainEqual({ row: 1, col: 1 })
    // (0,0) is 4 steps away — not reachable
    expect(tos).not.toContainEqual({ row: 0, col: 0 })
  })

  it('all tiers: same movement', () => {
    for (const h of [1, 2, 3] as const) {
      const state = makeState([{ row: 4, col: 4, type: 'samurai', owner: 'black', towerHeight: h }])
      const tos = getMoveTos(state, 4, 4)
      expectContains(tos, [[3,3],[5,5],[4,5]])
      expect(tos).not.toContainEqual({ row: 0, col: 0 })
    }
  })

  it('stops at occupied square', () => {
    const state = makeState([
      { row: 4, col: 4, type: 'samurai', owner: 'black' },
      { row: 4, col: 6, type: 'general', owner: 'white' }, // non-pawn enemy (capturable)
    ])
    const tos = getMoveTos(state, 4, 4)
    expect(tos).toContainEqual({ row: 4, col: 6 }) // can capture at step 2
    expect(tos).not.toContainEqual({ row: 4, col: 7 }) // cannot pass through
  })
})

// ─── Cannon ──────────────────────────────────────────────────────────────────

describe('Cannon', () => {
  it('tier 1 — exactly 2 squares orthogonally (jump, no slide)', () => {
    const state = makeState([{ row: 4, col: 4, type: 'cannon', owner: 'black' }])
    const tos = getMoveTos(state, 4, 4)
    expectExactly(tos, [[2,4],[6,4],[4,2],[4,6]])
  })

  it('tier 1 — can jump over pieces to reach 2-square target', () => {
    const state = makeState([
      { row: 4, col: 4, type: 'cannon', owner: 'black' },
      { row: 4, col: 5, type: 'pawn', owner: 'white' }, // intervening piece
    ])
    const tos = getMoveTos(state, 4, 4)
    expect(tos).toContainEqual({ row: 4, col: 6 }) // can still reach 2 squares
  })

  it('tier 2 — full rook sliding', () => {
    const state = makeState([{ row: 4, col: 0, type: 'cannon', owner: 'black', towerHeight: 2 }])
    const tos = getMoveTos(state, 4, 0)
    // Can slide east along row 4 to all 8 columns
    expectContains(tos, [[4,1],[4,2],[4,3],[4,4],[4,5],[4,6],[4,7],[4,8]])
    // Can slide north/south
    expectContains(tos, [[0,0],[1,0],[2,0],[3,0],[5,0],[6,0],[7,0],[8,0]])
  })

  it('tier 2 — stops at occupied square (capture included)', () => {
    const state = makeState([
      { row: 4, col: 0, type: 'cannon', owner: 'black', towerHeight: 2 },
      { row: 4, col: 3, type: 'general', owner: 'white' }, // non-pawn enemy (capturable)
    ])
    const tos = getMoveTos(state, 4, 0)
    expect(tos).toContainEqual({ row: 4, col: 3 }) // can capture
    expect(tos).not.toContainEqual({ row: 4, col: 4 }) // cannot pass
  })

  it('tier 3 — moves to empty like rook', () => {
    const state = makeState([{ row: 4, col: 4, type: 'cannon', owner: 'black', towerHeight: 3 }])
    const tos = getMoveTos(state, 4, 4)
    expectContains(tos, [[4,5],[4,6],[4,7],[4,8]]) // east
    expectContains(tos, [[4,3],[4,2],[4,1],[4,0]]) // west
    expectContains(tos, [[3,4],[2,4],[1,4],[0,4]]) // north
    expectContains(tos, [[5,4],[6,4],[7,4],[8,4]]) // south
  })

  it('tier 3 — cannot land on platform piece', () => {
    const state = makeState([
      { row: 4, col: 4, type: 'cannon', owner: 'black', towerHeight: 3 },
      { row: 4, col: 6, type: 'general', owner: 'white' }, // platform (non-pawn)
      { row: 4, col: 7, type: 'general', owner: 'white' }, // target after platform (non-pawn)
    ])
    const tos = getMoveTos(state, 4, 4)
    expect(tos).not.toContainEqual({ row: 4, col: 6 }) // platform: cannot land on it
    expect(tos).toContainEqual({ row: 4, col: 7 }) // can capture after platform
  })

  it('tier 3 — cannot capture without platform', () => {
    const state = makeState([
      { row: 4, col: 4, type: 'cannon', owner: 'black', towerHeight: 3 },
      { row: 4, col: 7, type: 'pawn', owner: 'white' }, // enemy, but no platform between
    ])
    const tos = getMoveTos(state, 4, 4)
    // Cannon can move to (4,5),(4,6) as empty squares
    // (4,7) is an enemy — but without a platform it can't be captured via Chinese cannon
    // HOWEVER: note that (4,7) IS the first occupied square going east from (4,4)
    // So it would be a platform, not a target. No capture.
    expect(tos).not.toContainEqual({ row: 4, col: 7 })
  })
})

// ─── Spy ─────────────────────────────────────────────────────────────────────

describe('Spy', () => {
  it('tier 1 — exactly 1 step ring (8 adjacent)', () => {
    const state = makeState([{ row: 4, col: 4, type: 'spy', owner: 'black' }])
    const tos = getMoveTos(state, 4, 4)
    expectExactly(tos, [
      [3,3],[3,4],[3,5],
      [4,3],      [4,5],
      [5,3],[5,4],[5,5],
    ])
  })

  it('tier 2 — exactly 2 steps in 8 directions, hopping over inner ring', () => {
    const state = makeState([
      { row: 4, col: 4, type: 'spy', owner: 'black', towerHeight: 2 },
      // Place pieces in inner ring to confirm spy hops over them
      { row: 3, col: 4, type: 'pawn', owner: 'white' }, // inner piece blocking (3,4)
    ])
    const tos = getMoveTos(state, 4, 4)
    // Should reach (2,4) even though (3,4) is occupied
    expect(tos).toContainEqual({ row: 2, col: 4 })
    // Full 2-step ring
    expectContains(tos, [
      [2,2],[2,4],[2,6],
      [4,2],      [4,6],
      [6,2],[6,4],[6,6],
    ])
  })

  it('tier 3 — exactly 3 steps in 8 directions', () => {
    const state = makeState([{ row: 4, col: 4, type: 'spy', owner: 'black', towerHeight: 3 }])
    const tos = getMoveTos(state, 4, 4)
    expectContains(tos, [
      [1,1],[1,4],[1,7],
      [4,1],      [4,7],
      [7,1],[7,4],[7,7],
    ])
  })

  it('tier 2 — corner: only in-bounds targets', () => {
    const state = makeState([{ row: 0, col: 0, type: 'spy', owner: 'black', towerHeight: 2 }])
    const tos = getMoveTos(state, 0, 0)
    // From (0,0), 2-step targets: (0,2),(2,0),(2,2) — (-2,-2), (-2,0), (-2,2), (0,-2) out of bounds
    expectExactly(tos, [[0,2],[2,0],[2,2]])
  })
})

// ─── Fortress ─────────────────────────────────────────────────────────────────

describe('Fortress', () => {
  it('tier 1 — king movement to empty squares', () => {
    const state = makeState([{ row: 4, col: 4, type: 'fortress', owner: 'black' }])
    const tos = getMoveTos(state, 4, 4)
    expectExactly(tos, [
      [3,3],[3,4],[3,5],
      [4,3],      [4,5],
      [5,3],[5,4],[5,5],
    ])
  })

  it('tier 1 — cannot move to enemy square (no capture)', () => {
    const state = makeState([
      { row: 4, col: 4, type: 'fortress', owner: 'black' },
      { row: 4, col: 5, type: 'pawn', owner: 'white' },
    ])
    const tos = getMoveTos(state, 4, 4)
    expect(tos).not.toContainEqual({ row: 4, col: 5 })
  })

  it('can stack on friendly tower', () => {
    const state = makeState([
      { row: 4, col: 4, type: 'fortress', owner: 'black' },
      { row: 4, col: 5, type: 'pawn', owner: 'black' }, // friendly pawn
    ])
    const tos = getMoveTos(state, 4, 4)
    expect(tos).toContainEqual({ row: 4, col: 5 })
  })

  it('all tiers: same movement', () => {
    for (const h of [1, 2, 3] as const) {
      const state = makeState([{ row: 4, col: 4, type: 'fortress', owner: 'black', towerHeight: h }])
      const tos = getMoveTos(state, 4, 4)
      expect(tos.length).toBe(8)
    }
  })
})

// ─── Archer ──────────────────────────────────────────────────────────────────

describe('Archer', () => {
  it('tier 1 — bishop up to 2 squares diagonally', () => {
    const state = makeState([{ row: 4, col: 4, type: 'archer', owner: 'black' }])
    const tos = getMoveTos(state, 4, 4)
    expectExactly(tos, [
      [3,3],[2,2],  // NW up to 2
      [3,5],[2,6],  // NE up to 2
      [5,3],[6,2],  // SW up to 2
      [5,5],[6,6],  // SE up to 2
    ])
    // No orthogonal moves
    expect(tos).not.toContainEqual({ row: 3, col: 4 })
    // No diagonal moves beyond 2
    expect(tos).not.toContainEqual({ row: 1, col: 1 })
  })

  it('tier 2 — full bishop (unlimited diagonal)', () => {
    const state = makeState([{ row: 4, col: 4, type: 'archer', owner: 'black', towerHeight: 2 }])
    const tos = getMoveTos(state, 4, 4)
    // NW diagonal: (3,3),(2,2),(1,1),(0,0)
    expectContains(tos, [[3,3],[2,2],[1,1],[0,0]])
    // SE diagonal: (5,5),(6,6),(7,7),(8,8)
    expectContains(tos, [[5,5],[6,6],[7,7],[8,8]])
    // No orthogonal
    expect(tos).not.toContainEqual({ row: 3, col: 4 })
  })

  it('tier 3 — queen movement (unlimited any direction)', () => {
    const state = makeState([{ row: 4, col: 4, type: 'archer', owner: 'black', towerHeight: 3 }])
    const tos = getMoveTos(state, 4, 4)
    // Should include orthogonal moves now
    expectContains(tos, [[3,4],[2,4],[1,4],[0,4]]) // north
    expectContains(tos, [[5,4],[6,4],[7,4],[8,4]]) // south
    expectContains(tos, [[4,3],[4,2],[4,1],[4,0]]) // west
    expectContains(tos, [[4,5],[4,6],[4,7],[4,8]]) // east
    // And diagonals
    expectContains(tos, [[3,3],[2,2],[1,1],[0,0]])
  })

  it('tier 1 — stops at occupied square', () => {
    const state = makeState([
      { row: 4, col: 4, type: 'archer', owner: 'black' },
      { row: 5, col: 5, type: 'general', owner: 'white' }, // non-pawn enemy (capturable)
    ])
    const tos = getMoveTos(state, 4, 4)
    expect(tos).toContainEqual({ row: 5, col: 5 }) // can capture at step 1
    expect(tos).not.toContainEqual({ row: 6, col: 6 }) // cannot pass
  })
})

// ─── Tower Stacking / Unstacking ─────────────────────────────────────────────

describe('Tower stacking', () => {
  it('piece type at tier depends on tower height (top piece)', () => {
    // Build a tower of height 2: bottom = pawn (black), top = marshal (black)
    const state = makeState([
      { row: 4, col: 4, type: 'marshal', owner: 'black', towerHeight: 2 },
    ])
    const tower = state.board[4]![4]!
    expect(tower.length).toBe(2)
    expect(tower[tower.length - 1]!.type).toBe('marshal')
  })

  it('max tower height 3 — cannot stack beyond 3', () => {
    const state = makeState([
      { row: 4, col: 4, type: 'marshal', owner: 'black' },
      { row: 4, col: 5, type: 'pawn', owner: 'black', towerHeight: 3 }, // full
    ])
    const tos = getMoveTos(state, 4, 4)
    // Cannot stack on (4,5) — full tower
    expect(tos).not.toContainEqual({ row: 4, col: 5 })
  })

  it('piece can be captured from top of tower, exposing piece below', () => {
    // This is tested via applyMove in special.test.ts
    // Here verify that only top piece can move
    const state = makeState([
      { row: 4, col: 4, type: 'marshal', owner: 'black', towerHeight: 2 },
      // Tower at (4,4): [pawn (bottom), marshal (top)]
    ])
    // Only marshal (top) generates moves — pawn is buried and cannot move
    const marshalMoves = getPieceMoves(state, { row: 4, col: 4 })
    expect(marshalMoves.length).toBeGreaterThan(0)
    expect(marshalMoves[0]!.type).not.toBe('place')
  })
})
