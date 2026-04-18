---
phase: 1
plan: 1
subsystem: engine
tags: [rule-engine, typescript, vitest, pure-functions]
dependency_graph:
  requires: []
  provides: [game-state, move-validation, legal-move-generation, check-detection]
  affects: []
tech_stack:
  added: [vitest@3, typescript@5]
  patterns: [pure-functions, discriminated-union, tower-as-array]
key_files:
  created:
    - packages/engine/src/types.ts
    - packages/engine/src/constants.ts
    - packages/engine/src/moveUtils.ts
    - packages/engine/src/movement.ts
    - packages/engine/src/phase.ts
    - packages/engine/src/check.ts
    - packages/engine/src/engine.ts
    - packages/engine/src/pieces/marshal.ts
    - packages/engine/src/pieces/pawn.ts
    - packages/engine/src/pieces/general.ts
    - packages/engine/src/pieces/major.ts
    - packages/engine/src/pieces/musketeer.ts
    - packages/engine/src/pieces/knight.ts
    - packages/engine/src/pieces/samurai.ts
    - packages/engine/src/pieces/cannon.ts
    - packages/engine/src/pieces/spy.ts
    - packages/engine/src/pieces/fortress.ts
    - packages/engine/src/pieces/archer.ts
    - packages/engine/tests/movement.test.ts
    - packages/engine/tests/phase.test.ts
    - packages/engine/tests/check.test.ts
    - packages/engine/tests/special.test.ts
  modified: []
decisions:
  - Dead pawn (pawn on board) cannot be captured by any piece — it acts as permanent terrain
  - Checkmate detection gated to hybrid phase only — placement phase zero-move state is not a loss
  - Spy onBoardCount tracked via relative decrement from pre-move state in tests (makeState does not set onBoardCount)
  - Enemy pawns in movement tests replaced with non-pawn pieces (generals) since dead pawns are uncapturable
metrics:
  duration: "~90 minutes"
  completed: "2026-04-17"
  tasks_completed: 1
  files_created: 25
---

# Phase 1 Plan 1: Rule Engine Summary

Pure TypeScript Gungi rule engine with all 11 piece types, 3-tier tower movement, hybrid phase enforcement, dead pawn immunity, Spy mutual capture, Fortress immunity, Cannon tier-3 Chinese cannon with dead-pawn platform, and checkmate detection — 88 Vitest tests all passing.

## What Was Built

### Package structure

```
packages/engine/
  src/
    types.ts         — GameState, Move, Piece, Tower, Player, all core types
    constants.ts     — board size, piece counts, kanji map, home rows, forward directions
    moveUtils.ts     — inBounds, canLandOn, buildMove, buildPlaceMove helpers
    movement.ts      — getLegalMoves, getPieceMoves, isInCheck, applyMoveNoValidation, cloneBoard
    phase.ts         — computePhase, canPlace, canMove, nextPlayer
    check.ts         — isCheckmate (delegates to getLegalMoves)
    engine.ts        — createInitialState, applyMove, resign, declareDraw
    pieces/          — one file per piece type (11 files)
  tests/
    movement.test.ts — 47 tests: all 11 pieces × 3 tiers
    phase.test.ts    — 12 tests: placement rules, hybrid transition, max-25 cap
    check.test.ts    — 10 tests: isInCheck, isCheckmate, check filtering
    special.test.ts  — 19 tests: dead pawn, spy mutual capture, fortress immunity, cannon platform
```

### Key design decisions implemented

**State shape** (`Tower = Piece[]`, index 0 = bottom, last = top):
- `board: (Tower | null)[][]` — 9×9, null = empty
- `phase: 'placement' | 'hybrid'` — transitions once BOTH players reach 15 placed
- `gameStatus: 'active' | 'checkmate' | 'resigned' | 'draw'`

**Dead pawn rule**: `canLandOn` returns false for any enemy pawn on top of a tower. Since pawns never move, every on-board pawn is permanently "dead" and immune to capture. This makes pawns act as terrain that blocks sliding pieces but cannot be removed.

**Spy mutual capture**: Implemented atomically in both `applyMoveNoValidation` (for check-detection simulation) and `executeMove` (for the authoritative path). After a spy captures, the spy is popped from the destination tower and the destination is nulled if empty.

**Fortress immunity**: `canLandOn` returns false for any fortress on top (enemy or friendly). Fortress's own move generator only allows moves to empty squares or stacking on friendly non-full towers.

**Cannon tier-3**: Slides to empty squares like rook; finds the first occupied square as "platform" (including dead pawns); then captures the first piece beyond the platform. Cannot land on the platform piece itself.

**Checkmate gating**: `isCheckmate` is only invoked in hybrid phase. In placement phase, a player with `placedCount >= 15` but the other player still placing has zero legal moves — that is not a loss.

**Phase transition**: `computePhase` checks both players' `placedCount >= 15`. Once both reach 15, phase flips to `hybrid` and board moves become available alongside continued placement (up to the 25-piece on-board cap).

## Test Results

```
Test Files  4 passed (4)
     Tests  88 passed (88)
  Duration  909ms
```

| Suite | Tests | Coverage |
|-------|-------|----------|
| movement.test.ts | 47 | All 11 pieces × 3 tiers, stacking, tower height |
| phase.test.ts | 12 | Initial state, placement zones, phase transition, 25-piece cap |
| check.test.ts | 10 | isInCheck, isCheckmate, check-filtering of illegal moves |
| special.test.ts | 19 | Dead pawn, spy mutual capture, fortress immunity, cannon-platform, pawn drop |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Checkmate triggered incorrectly in placement phase**
- **Found during:** Phase test execution (placeNPieces helper)
- **Issue:** After black placed 15 pieces and white placed their first piece, `isCheckmate` was called for black's next turn. Black had `placedCount=15` so `canPlace` returned false, AND `canMove` returned false (still in placement phase). Zero legal moves → `isCheckmate=true` → `gameStatus='checkmate'` → subsequent moves rejected with "Game is not active".
- **Fix:** Gated `isCheckmate` call in `executeMove` to `newPhase === 'hybrid'` only.
- **Files modified:** `packages/engine/src/engine.ts`
- **Commit:** 2d9f4d1

**2. [Rule 1 - Bug] Spy onBoardCount decrement double-applied in `applyMoveNoValidation`**
- **Found during:** Special test execution (spy mutual capture)
- **Issue:** After spy capture, the spy's removal from the destination tower used a stale `destTower` reference (which had already been set to a new array via `board[to.row]![to.col] = [movingPiece]`). The `.pop()` operated on the old array, not the current board cell.
- **Fix:** After placing the moving piece, read `board[to.row]![to.col]` fresh before popping the spy.
- **Files modified:** `packages/engine/src/movement.ts`
- **Commit:** 2d9f4d1

**3. [Rule 2 - Missing] Dead pawn capture immunity not implemented**
- **Found during:** Special test execution
- **Issue:** `canLandOn` allowed any piece to capture an enemy pawn. Per rules, dead pawns cannot be taken.
- **Fix:** Added `if (top.type === 'pawn' && top.owner !== owner) return false` in `canLandOn`.
- **Files modified:** `packages/engine/src/moveUtils.ts`
- **Commit:** 2d9f4d1

**4. [Rule 1 - Bug] Movement tests using enemy pawns as capture targets**
- **Found during:** Movement test failures after dead-pawn fix
- **Issue:** Tests for Musketeer, Samurai, Cannon tier-2, Cannon tier-3, and Archer used `type: 'pawn', owner: 'white'` as enemy pieces to test "capture and stop". After the dead-pawn fix, these pawns became uncapturable, breaking the test intent.
- **Fix:** Changed test enemy pieces from 'pawn' to 'general' in 5 affected tests.
- **Files modified:** `packages/engine/tests/movement.test.ts`
- **Commit:** 2d9f4d1

**5. [Rule 1 - Bug] Checkmate test scenario allowed black to stack on marshal**
- **Found during:** Checkmate test failure
- **Issue:** The checkmate scenario placed black's marshal in corner with all escape squares blocked by white fortresses and a white cannon giving check. But `getLegalMoves` also generates placement moves — black could place pieces from reserve ONTO the marshal's square (stacking), which shields the marshal from cannon attack.
- **Fix:** Override black's reserve to `[]` in the test state so no placement moves are available.
- **Files modified:** `packages/engine/tests/check.test.ts`
- **Commit:** 2d9f4d1

## Known Stubs

None — all implemented functionality is wired and functional.

## Threat Flags

None — this is a pure in-memory computation module with zero I/O, no network endpoints, no file access, no auth paths, and no schema changes. No new threat surface introduced.

## Self-Check: PASSED

Files verified:
- packages/engine/src/engine.ts ✓
- packages/engine/src/types.ts ✓
- packages/engine/src/movement.ts ✓
- packages/engine/tests/movement.test.ts ✓
- packages/engine/tests/special.test.ts ✓

Commit verified: `git log --oneline | grep 2d9f4d1` → found.
All 88 tests pass: `npm test` → 88 passed, 0 failed.
