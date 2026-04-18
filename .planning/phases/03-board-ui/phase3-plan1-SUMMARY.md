---
phase: 3
plan: 1
subsystem: client
tags: [react, vite, tailwind, zustand, socket-io, board-ui]
dependency_graph:
  requires: [phase1-plan1, phase2-plan1]
  provides: [board-ui, game-client, socket-client]
  affects: [packages/client]
tech_stack:
  added:
    - React 19 + react-dom
    - Vite 6 (bundler)
    - Tailwind CSS 4.1 (@tailwindcss/vite)
    - Zustand 5 + Immer 10
    - Socket.IO client 4.8
    - React Router DOM 7
  patterns:
    - Zustand Immer store for all game/UI state
    - Socket.IO singleton with store-dispatch event handlers
    - Client-side legal move computation via @gungi/engine.getLegalMoves
    - SVG arc segments for tower height visualization
key_files:
  created:
    - packages/client/src/components/Board/PieceToken.tsx
    - packages/client/src/components/Board/Board.tsx
    - packages/client/src/components/Board/Cell.tsx
    - packages/client/src/components/Reserve/ReservePanel.tsx
    - packages/client/src/components/Reserve/ReserveSlot.tsx
    - packages/client/src/components/GameOver/GameOverOverlay.tsx
    - packages/client/src/components/Chat/ChatPanel.tsx
    - packages/client/src/components/Chat/ChatMessage.tsx
    - packages/client/src/components/Controls/GameControls.tsx
    - packages/client/src/components/Room/CreateRoom.tsx
    - packages/client/src/components/Room/WaitingRoom.tsx
    - packages/client/src/components/Room/GamePage.tsx
    - packages/client/src/store/gameStore.ts
    - packages/client/src/socket/client.ts
    - packages/client/src/hooks/useLegalMoves.ts
    - packages/client/src/hooks/useGame.ts
    - packages/client/src/App.tsx
    - packages/client/src/main.tsx
    - packages/client/src/styles.css
    - packages/client/index.html
    - packages/client/package.json
    - packages/client/tsconfig.json
    - packages/client/vite.config.ts
  modified:
    - packages/engine/src/engine.ts
    - packages/engine/src/movement.ts
    - packages/engine/src/pieces/marshal.ts
decisions:
  - Static import for socket/client.ts to avoid Vite dynamic import splitting warning
  - Tower height shown as filled arc segments (120° each, 5° gaps) in SVG
  - Client-side move highlighting via getLegalMoves (no server round-trip)
  - Zustand Immer store owns all game/UI state; socket handlers dispatch to store
  - React Router v7 hash routing: / for CreateRoom, /room/:code for GamePage
metrics:
  duration: ~2h
  completed: 2026-04-18
  tasks_completed: 12
  files_created: 23
  files_modified: 3
---

# Phase 3 Plan 1: Board UI Summary

React 19 + Vite 8 game client with dark-wood 9x9 board, SVG kanji poker-chip pieces with segmented tower-height ring, full socket wiring to the Phase 2 server, and Zustand+Immer state management.

## What Was Built

### Visual Components

**PieceToken** (`Board/PieceToken.tsx`): SVG circular poker-chip piece token. Center shows kanji character (帅兵大中筒马士炮忍岩弓) in Noto Serif SC, colored red for Black or dark charcoal for White. Outer ring uses three 110° SVG arc segments (5° gaps) to visualize tower height: 1 arc filled = height 1, 2 = height 2, 3 = full ring. Filled arc color is red (Black) or dark gray (White); empty arcs are light cream.

**Board** (`Board/Board.tsx`): 9x9 grid with dark wood CSS gradient texture (repeating grain lines overlaid on a brown gradient). Column labels a–i and row labels 1–9 around the perimeter. Each cell is a fixed 56x56px square.

**Cell** (`Board/Cell.tsx`): Individual cell with six highlight states — `selected` (amber tint), `legal-empty` (amber dot), `legal-capture` (pulsing red ring), `legal-stack` (amber ring), `last-move-from` and `last-move-to` (amber tint). Tower height shown as a small badge when > 1.

### Reserve & Controls

**ReservePanel** + **ReserveSlot**: Sidebar panels showing each player's unplaced pieces as token previews with piece counts. Clicking a slot in your own panel during your turn enters drop mode; valid drop squares are highlighted on the board.

**GameControls**: Resign with two-step confirmation, offer/accept/decline draw flow with pending state display.

### Pages

**CreateRoom**: Home page with display name input, create-room button (calls `POST /api/rooms`), and join-by-code input. Initializes anonymous guest session via `POST /api/auth/sign-in/anonymous` and stores token in localStorage.

**WaitingRoom**: Shown after creating a room or while waiting for opponent. Displays room code in large monospace font plus a copyable share URL.

**GamePage**: Full game layout — opponent reserve (left), board (center), own reserve + controls + chat (right). Header shows current turn and phase. Handles all click logic for piece selection, move execution, and piece drops.

### Infrastructure

**gameStore** (`store/gameStore.ts`): Zustand + Immer store holding connection state, game state, UI selection state (selectedPosition, selectedReservePiece, legalMoves), lastMove, chat messages, draw state, and waiting flag.

**socket/client.ts**: Socket.IO singleton. Attaches all server event handlers on creation and dispatches directly into the Zustand store. Exports typed emitters: `emitMove`, `emitResign`, `emitDrawOffer/Accept/Decline`, `emitChatMessage`, `emitJoinRoom`.

**useLegalMoves**: Hook computing legal moves client-side from `@gungi/engine.getLegalMoves` for instant highlight feedback without a server round-trip.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing exports] Added missing type exports to @gungi/engine**
- **Found during:** Task 1 (TypeScript check)
- **Issue:** `Tower`, `Piece`, `PlayerState`, `Tier`, `GamePhase`, `GameStatus`, `MoveType` were defined in `packages/engine/src/types.ts` but not re-exported from `engine.ts`. Client components importing `@gungi/engine` could not access these types.
- **Fix:** Added all missing type exports to the `export type { ... }` line in `engine.ts`
- **Files modified:** `packages/engine/src/engine.ts`
- **Commit:** 3be5da4

**2. [Rule 1 - Bug] Removed unused imports from engine source that blocked client typecheck**
- **Found during:** TypeScript check (`noUnusedLocals: true` in client tsconfig propagated into engine source via path alias)
- **Issue:** `engine.ts` imported `Position`, `isInCheck`, `applyMoveNoValidation`, `MAX_ON_BOARD`, `HOME_ROWS`, `PLACEMENT_THRESHOLD`, `getTopPiece` without using them; `movement.ts` imported `inBounds`, `canLandOn`, `PIECE_KANJI` without using them; `marshal.ts` imported `getTopPiece` without using it.
- **Fix:** Removed the unused imports from all three engine files
- **Files modified:** `packages/engine/src/engine.ts`, `packages/engine/src/movement.ts`, `packages/engine/src/pieces/marshal.ts`
- **Commit:** 3be5da4

**3. [Rule 3 - Blocking] Replaced dynamic `import()` calls with static import**
- **Found during:** Build (Vite warning about dynamic+static import conflict)
- **Issue:** `GamePage.tsx` used `import('../../socket/client').then(...)` inside callbacks, but `socket/client.ts` was already statically imported elsewhere, causing Vite to warn and preventing chunk splitting.
- **Fix:** Added `emitMove` to the static import at the top of `GamePage.tsx` and removed the dynamic import calls
- **Files modified:** `packages/client/src/components/Room/GamePage.tsx`
- **Commit:** 3be5da4

## Known Stubs

None. All components are wired to live server data via the Zustand store and Socket.IO handlers. No hardcoded placeholder data flows to rendered UI.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: client-side-session-token | socket/client.ts | Session token read from localStorage and sent on every `room:join` emit — already authenticated server-side via better-auth, but token is visible in JS memory |
| threat_flag: anonymous-guest-auto-create | CreateRoom.tsx | Guest session auto-created on page load via `POST /api/auth/sign-in/anonymous` — rate limiting on this endpoint should be enforced server-side |

## Self-Check

Files exist:
- packages/client/src/components/Board/PieceToken.tsx: FOUND
- packages/client/src/components/Board/Board.tsx: FOUND
- packages/client/src/store/gameStore.ts: FOUND
- packages/client/src/socket/client.ts: FOUND
- packages/client/dist/index.html: FOUND (build output)

Commits:
- 3be5da4: feat: implement board UI (Phase 3) — FOUND

## Self-Check: PASSED
