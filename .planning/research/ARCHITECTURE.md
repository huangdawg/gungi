# Architecture Patterns

**Domain:** Real-time multiplayer browser-based board game (Gungi)
**Researched:** 2026-04-17

---

## Recommended Architecture

### Overview

An **authoritative server model** with a thin client renderer. The server holds the single source of truth for game state. Clients send intent ("place piece at [4,3]"); the server validates the intent against the rule engine, mutates state if legal, and broadcasts the new canonical state to both players. Clients never mutate local game state directly in response to their own actions — they wait for the server echo.

This is the industry-standard pattern for competitive board games. Client-side prediction (optimistic UI) is appropriate for action games but adds rollback complexity that is not warranted for a turn-based game with sub-100ms server round-trips on a local/regional deployment.

```
Browser (Player 1)                 Server                 Browser (Player 2)
     |                               |                          |
     |── action event ────────────>  |                          |
     |                          [validate]                      |
     |                          [mutate state]                  |
     |  <── state_update ──────────  | ── state_update ──────>  |
     |                               |                          |
     |         (render new state)    |    (render new state)    |
```

---

## Component Boundaries

### 1. Client — UI Layer

**Responsibility:** Render game state; capture and emit player actions. Nothing more.

| Sub-component | What it does |
|---------------|-------------|
| Board renderer | Draws 9x9 grid, towers, piece labels from canonical state |
| Piece hand panel | Displays undeployed pieces for drop mechanic |
| Action dispatcher | Translates click/drag gestures into typed action events sent over WebSocket |
| State subscriber | Receives `state_update` from server, replaces local game state, triggers re-render |
| Lobby UI | Room creation, join via code, waiting-room screen |
| Connection status | Reconnect handling, displays "opponent disconnected" banner |

**Does NOT:** validate moves, compute legal moves (for display hints), maintain authoritative board state, or run the rule engine. It may run a read-only copy of the rule engine to compute move highlights for UX — but must never act on those locally.

**Communicates with:** Realtime layer (WebSocket events only)

---

### 2. Realtime Layer — WebSocket Gateway

**Responsibility:** Manage socket connections, map sockets to rooms/players, route messages between client and game server logic.

| Sub-component | What it does |
|---------------|-------------|
| Socket server (Socket.io) | Accepts connections, manages socket lifecycle |
| Room registry | Maps room codes → { player1SocketId, player2SocketId, gameId } |
| Session resolver | Associates anonymous/authenticated session tokens to player slots |
| Message router | Routes inbound action events to the game engine; routes outbound state updates to correct room |
| Reconnect handler | On reconnect, resolves existing session, replays current state snapshot to rejoining player |

**Communicates with:** Client (WebSocket events), Game Engine (function calls / in-process), Persistence layer (reads/writes game state)

---

### 3. Game Engine — Rule Engine + State Machine

**Responsibility:** The authoritative heart of the application. All game rules live here, server-side only. The engine is a pure function: given current state + action, return new state or an error.

| Sub-component | What it does |
|---------------|-------------|
| State machine | Manages phase transitions: `SETUP → PLAY → GAME_OVER` |
| Setup phase controller | Enforces piece placement rules, alternate turns, consecutive-pass end condition, mandatory piece counts |
| Play phase controller | Enforces turn alternation, legal move generation, drop rules |
| Rule validator | Per-piece movement rules at each tier (1/2/3), tower-height-dependent logic |
| Tower manager | Stacking / unstacking logic; max height 3; top piece only moves |
| Check/checkmate detector | Marshal-in-check detection after each move |
| Special-rule handlers | Spy mutual-capture, Fortress immunity, Pawn dead-pawn terrain, Pawn drop restrictions |

**Key design decision:** The rule engine is written as a framework-agnostic TypeScript module with zero I/O dependencies. It can be `import`-ed by the server for authoritative use, and optionally bundled into the client for move-hint computation (read-only). This dual-use is safe because the client copy is never trusted.

**Does NOT:** know about sockets, HTTP, databases, or React.

**Communicates with:** Realtime layer (receives actions, returns new state), Persistence layer (state serialized in/out)

---

### 4. Lobby & Room System

**Responsibility:** Pre-game session management — room creation, join flows, anonymous/auth identity.

| Sub-component | What it does |
|---------------|-------------|
| Room creator | Generates unique room code (6-char alphanumeric), stores room record, returns join URL |
| Room joiner | Validates room code, assigns player slot (Player 1 / Player 2), issues session token |
| Guest identity | Assigns random display name + ephemeral session token to unauthenticated visitors |
| Auth layer (optional) | JWT-based optional login; persists identity across sessions |
| Waiting room | Holds creator in "waiting" state until second player joins, then emits `game_start` |

**Communicates with:** HTTP API (room creation/join endpoints), Realtime layer (triggers game initialization)

---

### 5. Persistence Layer

**Responsibility:** Store game state so reconnects and server restarts don't lose games.

| Sub-component | What it does |
|---------------|-------------|
| Game state store | Serializes full game state (board, towers, hands, phase, turn, move history) to database after each move |
| Room record | Stores room metadata: code, player IDs, status (waiting/active/complete) |
| Move log | Append-only list of validated moves for replay/history |
| Session store | Maps session tokens to player identity; supports reconnect within TTL |

**Technology:** PostgreSQL for game state and room records (transactional, durable). Redis optional for ephemeral session tokens and short-lived reconnect grace periods (5-minute TTL). At minimum viable scale (2-player private rooms, low concurrency), Postgres alone is sufficient — Redis can be deferred.

---

## Data Flow

### Game Move (happy path)

```
1. Player clicks piece → destination
2. Client emits: { type: "MOVE", from: [r,c], to: [r,c], sessionToken }
3. Server WebSocket handler receives event
4. Session resolver: validate token → resolve playerId + roomId
5. Room registry: confirm it is this player's turn
6. Rule engine: validate(currentState, action) → { ok: true, newState }
7. Persistence: write newState to DB (atomic)
8. Socket server: emit state_update(newState) to BOTH sockets in room
9. Both clients receive state_update, replace local state, re-render
```

### Invalid Move

```
Steps 1–6 same
6. Rule engine returns { ok: false, error: "ILLEGAL_MOVE" }
7. Server emits move_rejected(error) to the acting player's socket only
8. Client shows error feedback (highlight, shake animation)
9. No state broadcast — game state unchanged
```

### Reconnect

```
1. Client WebSocket drops (network loss, tab refresh)
2. Socket server fires disconnect event; marks player slot as "disconnected"
   (game continues in-place for 5-minute grace window — not abandoned)
3. Client reconnects; sends reconnect event with sessionToken
4. Session resolver: finds existing game room via token
5. Server emits full state_snapshot to rejoined socket
6. Client re-renders from snapshot; game resumes
```

### Phase Transition (Setup → Play)

```
Both players pass consecutively during setup phase
→ Rule engine emits phase_transition event
→ State machine advances: SETUP → PLAY
→ state_update broadcast includes phase: "PLAY"
→ Clients switch UI from piece-placement mode to move mode
```

---

## Where Game Rules Live

| Rule Type | Location | Rationale |
|-----------|----------|-----------|
| Move validation (is this move legal?) | Server only (authoritative) | Cheat prevention — never trust client |
| Legal move generation for UI hints | Client copy of rule engine (read-only) | Highlight valid destinations without a round-trip |
| Tower stacking legality | Server only | State mutation — must be authoritative |
| Check detection | Server only | Determines turn legality |
| Checkmate detection | Server only | Ends game |
| Pawn restriction rules | Server only | Complex multi-condition — authoritative |
| Spy mutual-capture | Server only | State mutation |
| Phase transition conditions | Server only | Authoritative state machine |
| Display logic (which piece on top, tower height render) | Client | Derived from canonical state, no mutation |

**Rule sharing pattern:** Implement the rule engine as a pure TypeScript module (`packages/game-engine` or `src/engine/`). Import it in server code for validation. Tree-shake or selectively import in client code for move-hint generation only. This avoids two separate implementations drifting out of sync.

---

## State Management Approach

### Server-Side State Shape

```typescript
interface GameState {
  roomId: string;
  phase: "WAITING" | "SETUP" | "PLAY" | "GAME_OVER";
  turn: "BLACK" | "WHITE";
  setupConsecutivePasses: number;        // Tracks consecutive passes to end setup
  board: Tower[][];                      // 9x9 grid; each cell is a stack of 0-3 pieces
  hands: {                               // Undeployed pieces per player
    BLACK: PieceType[];
    WHITE: PieceType[];
  };
  capturedBy: {                          // Pieces permanently removed (captured)
    BLACK: PieceType[];
    WHITE: PieceType[];
  };
  moveHistory: Move[];
  winner: "BLACK" | "WHITE" | null;
  players: {
    BLACK: { sessionToken: string; displayName: string; connected: boolean };
    WHITE: { sessionToken: string; displayName: string; connected: boolean };
  };
}

type Tower = Piece[];  // index 0 = bottom, last index = top (active piece)

interface Piece {
  type: PieceType;
  color: "BLACK" | "WHITE";
}
```

The tower-as-array-per-cell model is the natural representation for Gungi. `board[row][col]` is an array of pieces; `board[row][col].length` is the tower height (0–3); the top piece (`at(-1)`) is what moves and can be captured.

### Client-Side State Shape

The client holds a single reactive store (Zustand recommended over Redux for this scale) containing:
- `gameState: GameState` — the last server-confirmed canonical state
- `selectedCell: [row, col] | null` — UI selection state
- `legalMoves: [row, col][]` — computed client-side from engine copy, purely for rendering highlights
- `connectionStatus: "connected" | "disconnected" | "reconnecting"`
- `pendingAction: boolean` — true while awaiting server echo (disable further input)

No optimistic updates. `pendingAction` flag prevents double-sends and gives feedback while the server round-trip completes.

---

## Suggested Build Order

Dependencies flow bottom-up. Each layer must be stable before the next.

### Layer 1 — Rule Engine (no dependencies)
Build first. It is the most complex, most testable, and everything else depends on it.

- Tower data structure and manipulation
- Per-piece movement generation at each tier
- Move legality validation
- Special rules (Spy, Fortress, Pawn restrictions, dead pawn)
- Check and checkmate detection
- Setup phase logic (placement validation, consecutive-pass end condition)
- Drop mechanic validation

**Output:** Fully unit-tested, framework-agnostic TypeScript module. Target: 90%+ coverage before moving to Layer 2.

---

### Layer 2 — Persistence Layer (depends on: data model from Layer 1)
Define and implement storage before connecting real-time logic.

- Database schema (rooms, game_states, move_log, sessions)
- CRUD functions for game state read/write
- Session token generation and validation

---

### Layer 3 — HTTP API + Lobby (depends on: Layer 2)
Pre-game flows before any real-time game logic.

- `POST /rooms` — create room, return code + join URL
- `POST /rooms/:code/join` — join room, assign player slot, return session token
- `GET /rooms/:code` — room status (waiting/active)
- Guest identity generation
- Optional: auth endpoints

---

### Layer 4 — WebSocket Server + Game Engine Integration (depends on: Layers 1, 2, 3)
Wire the rule engine to the realtime layer.

- Socket.io server with room-based routing
- Action event handlers (PLACE_PIECE, MOVE_PIECE, DROP_PIECE, PASS)
- Rule engine invocation on each action
- State broadcast after valid moves
- Phase transition handling
- Reconnect flow (session resume + state snapshot delivery)
- Disconnect grace window

---

### Layer 5 — Client Game UI (depends on: Layer 4 interface contract)
Can start scaffolding with mock data in parallel with Layer 4, but requires stable event schema.

- Board rendering (9x9, towers, piece labels)
- Piece hand panel
- Selection and move-hint highlighting (uses client copy of rule engine)
- WebSocket integration (action emit, state_update subscription)
- Setup phase UI vs play phase UI modes
- Connection status banners

---

### Layer 6 — Lobby UI (depends on: Layer 3 + Layer 4 waiting room event)

- Room creation page
- Join-by-code page
- Waiting room screen
- Guest name display / optional auth login

---

## Scalability Considerations

Gungi is a 2-player private-room game. Scaling targets are modest. The architecture above handles hundreds of concurrent games on a single Node.js server without architectural changes.

| Concern | At 10 concurrent games | At 100 concurrent games | At 1000+ |
|---------|----------------------|------------------------|----------|
| WebSocket connections | Trivial (20 sockets) | Fine (~200) | Consider horizontal scaling + sticky sessions |
| State persistence | Any DB | Any DB | Postgres connection pooling |
| In-process game state | Hash map in memory | Fine | Redis for shared state if multi-instance |
| Rule engine CPU | Negligible (turn-based, no tick loop) | Negligible | Still negligible |

For v1, a single server process with in-memory room state (backed by Postgres for durability) is the correct choice. Do not add Redis complexity unless measured need emerges.

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Client-Side Rule Authority
**What:** Validating moves on the client and sending "move accepted" to the server.
**Why bad:** Trivially cheatable via browser console. Also creates state divergence bugs when client and server logic drift.
**Instead:** Server validates all moves. Client only renders what server confirms.

### Anti-Pattern 2: Per-Move HTTP REST Requests
**What:** Using `POST /move` for each game action instead of WebSockets.
**Why bad:** HTTP adds 50–200ms overhead per move, requires polling for opponent state, and makes real-time feel latency-bound.
**Instead:** WebSocket for all in-game events. HTTP only for pre-game lobby (room create/join).

### Anti-Pattern 3: Two Independent Rule Engine Implementations
**What:** Writing server-side validation logic in one language/module and client-side move-hint logic in another.
**Why bad:** Inevitable drift. Bugs appear where hint shows legal but server rejects, or vice versa.
**Instead:** Single TypeScript rule engine module imported by both server and client.

### Anti-Pattern 4: Sending Full State on Every Tick
**What:** Broadcasting the entire 9x9 board + all metadata on every event, even for large state.
**Why bad:** Unnecessary bandwidth; JSON serialization of full board is ~3–5 KB per event.
**Instead:** Send full state on game start and reconnect. Send delta or move-result for individual moves (the move + resulting board change). Alternatively, send full state always given the modest size — simplicity over premature optimization at this scale.

### Anti-Pattern 5: Skipping the Setup Phase State Machine
**What:** Treating setup and play as the same phase with conditional logic scattered throughout.
**Why bad:** Gungi setup has distinct rules (mandatory pieces, consecutive-pass end, no captures). Mixing it with play-phase logic creates a correctness minefield.
**Instead:** Explicit `SETUP` and `PLAY` phases in the state machine with different action handlers, validators, and turn-order logic per phase.

---

## Sources

- [Gabriel Gambetta — Client-Server Game Architecture](https://www.gabrielgambetta.com/client-server-game-architecture.html) — HIGH confidence (authoritative reference)
- [Lance.gg Architecture Overview](https://lance-gg.github.io/docs_out/tutorial-overview_architecture.html) — MEDIUM confidence
- [boardgame.io — State Management for Turn-Based Games](https://boardgame.io/documentation/) — HIGH confidence (official docs)
- [Colyseus — Multiplayer Framework for Node.js](https://colyseus.io/) — HIGH confidence (official site)
- [Building a Multiplayer Board Game with WebSockets — DEV Community](https://dev.to/krishanvijay/building-a-multiplayer-board-game-with-javascript-and-websockets-4fae) — MEDIUM confidence
- [MPL Gaming — Designing Scalable Server-Authoritative Card Games](https://www.mplgaming.com/server-authoritative-games/) — MEDIUM confidence
- [Hathora — Scalable WebSocket Architecture](https://blog.hathora.dev/scalable-websocket-architecture/) — MEDIUM confidence
- [WebSocket Reconnection Guide — WebSocket.org](https://websocket.org/guides/reconnection/) — MEDIUM confidence
- [WebGameDev — Client-Side Prediction and Server Reconciliation](https://www.webgamedev.com/backend/prediction-reconciliation) — MEDIUM confidence
