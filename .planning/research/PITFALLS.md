# Domain Pitfalls: Real-Time Multiplayer Browser Board Game (Gungi)

**Domain:** Turn-based real-time multiplayer board game, chess-like rule engine, WebSocket synchronization
**Researched:** 2026-04-17
**Scope:** Greenfield build — Gungi Online

---

## Critical Pitfalls

Mistakes that cause rewrites, data corruption, or unfixable desync.

---

### Pitfall 1: Rule Engine Built Without a Canonical State Representation

**What goes wrong:** The game state is stored as a loose collection of variables (board array, turn flag, captured pieces list, etc.) spread across functions, components, or ad-hoc objects. As Gungi rules accumulate — towers, drop restrictions, mutual capture, dead pawns — each rule reads state slightly differently. After 2–3 months, adding any new rule requires touching 6 files, and bugs arise because one reader has stale structure expectations.

**Why it happens:** Developers start with a simple 2D board array (natural for chess-like games) and bolt on tower height as a separate array, then piece ownership as another array. The model was never designed for 3D stacking.

**Consequences:** Tower stacking becomes a tangled mess. Check detection reads from one state model, move generation reads from another. Serialization for WebSocket sync becomes fragile. Tests pass in isolation but fail in combination.

**Prevention:**
- Define a single canonical `GameState` type from day one that encodes all necessary information in one place. For Gungi this means: each board cell is either `null` or a `Tower` — an ordered array of `{ piece: PieceType, owner: Player }` objects where index 0 is the bottom and the last element is the top. Phase (setup vs. play), turn, captured pieces per player, and move history (for repetition if ever needed) all live in this one object.
- All rule functions take `GameState` as pure input and return a new `GameState` or move list. No side effects, no reading from external stores.
- Enforce with TypeScript — lean types, not generic `any` board representations.

**Detection (warning signs):**
- You have more than one variable representing "whose turn is it"
- Move validation functions accept more parameters than `(state: GameState, move: Move)`
- You need to call multiple functions to reconstruct what piece is on a given square

**Phase to address:** Rule Engine phase (first implementation phase). The data model must be locked before any piece rules are coded.

---

### Pitfall 2: Client-Trusted Move Validation

**What goes wrong:** The client computes move legality, sends `{ move: "d3-e5" }` to the server, and the server applies it without re-validating. Any player who can intercept and modify WebSocket messages — or simply open DevTools — can make illegal moves, skip turns, or move the opponent's pieces.

**Why it happens:** Developers prototype locally where both "players" run in the same browser. It works. The validation code lives on the client already. Replicating it server-side feels redundant.

**Consequences:** The game is trivially cheatable. For a private friend-group game this may seem tolerable, but it also means any client bug (race condition, stale state) can corrupt shared game state in ways the server will silently accept.

**Prevention:**
- The rule engine lives only on the server (Node.js). The client sends intent: `{ type: "MOVE", from: {row, col}, to: {row, col} }` or `{ type: "DROP", piece: "Pawn", to: {row, col} }`.
- The server re-runs the full legality check against its authoritative `GameState`. If invalid, it rejects with an error event and re-broadcasts current state to both players.
- The client may have a local copy of the rule engine for UX purposes (highlighting legal moves, instant feedback) but this is a convenience layer only — the server's judgment is final.
- Share the rule engine as a pure TypeScript module imported by both server and client (if using a monorepo). This avoids duplication while keeping authority on the server.

**Detection (warning signs):**
- Server handler for move events does not call any validation function
- Client-side move submission contains the resolved destination rather than just intent
- No server-side rejection path for invalid moves

**Phase to address:** Rule Engine phase (when the engine is first built, design it as a pure module). Multiplayer phase (when wiring up WebSockets, ensure server imports and calls the engine before applying state).

---

### Pitfall 3: Tower Stacking State Corrupted by Partial Captures

**What goes wrong:** When a piece at the top of a tower is captured, only the top is removed. But if the capture event is applied only on one side (client and server diverge due to a bug), the tower heights fall out of sync. Subsequent move calculations for pieces below in the tower use the wrong tier, producing wrong movement sets.

**Gungi-specific variant:** The Spy's mutual capture (both attacker and defender are removed) is a single atomic event. If implemented as two separate capture operations with any async gap, one player might see the Spy disappear but its victim remain, or vice versa.

**Why it happens:** Towers are mutated in place. Capture removes the top element. Mutual capture is modeled as "capture A, then capture B" rather than as one atomic state transition.

**Consequences:** Tier-dependent movement (especially Knight tier 2 vs tier 3, Cannon tier 2 vs tier 3) becomes wrong. The desync is invisible until a player tries to make a move that should be legal but isn't, or vice versa.

**Prevention:**
- Immutable state updates: every move/capture returns a new `GameState` object. Never mutate the tower array directly — use spread/slice to produce new arrays.
- Model mutual capture as a single `applyMove(state, move)` call that returns the post-state with both pieces removed in one transaction. The `MoveResult` type distinguishes: `{ type: "MUTUAL_CAPTURE", attacker: Position, defender: Position }`.
- Tower height is always derived from `tower.length` — never stored as a separate field that can drift.
- Serialize full tower state in every WebSocket state broadcast; never send partial diffs for tower mutations.

**Detection (warning signs):**
- Tower height stored as a separate `height` field rather than derived from array length
- `captureTop` and `removeAttacker` are separate function calls rather than one atomic transition
- WebSocket events send `{ capturedAt: {row, col} }` without the full updated board

**Phase to address:** Rule Engine phase (data model), Game Logic phase (capture resolution).

---

### Pitfall 4: Check/Checkmate Detection Missing Discovered Checks and Tower-Change Effects

**What goes wrong:** Check detection only looks at whether the move just made directly attacks the Marshal. It misses: (1) a move that reveals a sliding piece attack on the Marshal (discovered check); (2) a move that changes the tower composition of the moved piece, altering its movement tier and therefore its attack set.

**Gungi-specific complexity:** When a piece drops onto a tower, the piece underneath changes tier. This can retroactively change whether that underlying piece was giving check. For example, a Cannon that was tier 1 (moves exactly 2 squares) may become tier 2 (full rook) when a piece drops onto it — suddenly giving check without any "move" happening.

**Why it happens:** Developers write `isInCheck()` by examining only the attacking player's last-moved piece. Standard chess check detection doesn't anticipate tier changes from drops.

**Consequences:** Games proceed past checkmate silently. Players can leave their Marshal in check. Or false checkmate is declared when it does not exist. Both outcomes are catastrophic to trust in the rule engine.

**Prevention:**
- After every state transition (move, drop, or even the setup phase), recompute check status from scratch: for each opponent piece, generate all attacks from its current tier (derived from current tower height), check if Marshal square is in the attack set.
- `isInCheck(state: GameState, player: Player): boolean` must iterate all opponent pieces on the board, not just the last-moved piece.
- Checkmate detection: attempt every legal move for the player in check. If none of them produces a `GameState` where `isInCheck` returns false, it is checkmate. This is O(moves × board_scan) but entirely acceptable for a turn-based game.
- Add property-based tests: generate random-ish positions with known check/no-check status and assert correctness.

**Detection (warning signs):**
- `isInCheck` function signature takes a `lastMove` parameter (implies only the last move is scanned)
- No re-check of check status after a DROP action
- No test cases covering discovered check scenarios

**Phase to address:** Rule Engine phase (check detection), Game Logic phase (end condition).

---

### Pitfall 5: Setup Phase State Machine Not Enforced Server-Side

**What goes wrong:** The game has two distinct phases — Setup (piece placement, alternating, with specific rules about mandatory pieces and consecutive pass ending setup) and Play (normal turns). The server only models the Play phase. Setup is handled entirely by the client, and when setup ends the client sends the final board position. The server accepts it without validating that placement rules were followed.

**Gungi-specific complexity:** Players may not place the Marshal off their back rows, cannot place pawns in files already containing a friendly pawn, and consecutive passing ends setup. These constraints require server-side validation.

**Why it happens:** Setup feels like "just placing pieces before the real game starts." Developers defer validating it as "we'll add that later."

**Consequences:** Illegal starting positions. Board states that are impossible under the rules. Players who exploit setup to place duplicate pieces or an illegal Marshal position.

**Prevention:**
- The server manages a `GamePhase` enum: `SETUP | PLAY | ENDED`. All incoming events are only valid for the current phase.
- During SETUP, the server validates each placement against the same rule engine module: `isLegalDrop(state, player, piece, position)` (which is a subset of the Play-phase drop logic).
- The server tracks setup state: how many of each piece each player has placed, pass counts per player, and triggers phase transition to PLAY when both players have consecutively passed.
- Never accept a "setup complete, here is my board" message — only accept incremental placement events.

**Detection (warning signs):**
- A `SETUP_COMPLETE` event type that carries a full board layout from the client
- Server phase transition logic lives in the client
- No server-side piece count validation during setup

**Phase to address:** Game Logic phase (state machine design).

---

### Pitfall 6: WebSocket Desync from Race Condition on Concurrent Actions

**What goes wrong:** Player A submits a move. Before the server processes it, Player A's client crashes and reconnects. The reconnecting client requests current state. The server sends stale state (before the move was applied) because the move processing and state-send are in two separate async operations with no locking. Player A's move is lost, but A's client thinks it was applied.

**Variant:** Two rapid-fire events arrive from the same client (double-click, network retry of a timed-out submit). The server applies the same move twice, producing an impossible board state.

**Why it happens:** Node.js event loop is single-threaded but async I/O means WebSocket event handlers can interleave. `await db.saveState(newState)` followed by `broadcastState(newState)` is not atomic.

**Consequences:** Out-of-sync clients. Moves appearing and disappearing. Corrupted board states that neither player can explain.

**Prevention:**
- Serialize all game actions through a per-room action queue. Process one action at a time per room. If a second action arrives while processing, queue it; do not process concurrently.
- Assign a monotonically incrementing `stateVersion` to every `GameState`. Every client tracks `lastKnownVersion`. State broadcasts always include the version. Clients that receive a state with `version <= lastKnownVersion` discard it.
- On reconnect, the client sends `{ reconnect: true, lastKnownVersion: N }`. The server sends the full current state only if `currentVersion > N`.
- To prevent duplicate move submission: each move carries a client-generated `moveId` (UUID or seq number). Server tracks the last 10 processed `moveId`s per room. If a `moveId` arrives that was already processed, respond with the current state and do not re-apply.

**Detection (warning signs):**
- Move handler directly calls `broadcastState()` without going through a serialized queue
- No `stateVersion` field on GameState
- Reconnect handler sends full state unconditionally without checking what the client already has

**Phase to address:** Multiplayer / WebSocket phase.

---

### Pitfall 7: Anonymous Session Identity Lost on Reconnect

**What goes wrong:** A guest player (no account) refreshes the page or their connection drops. The server has no way to associate the new connection with the player's seat in the active game. The new connection is treated as a spectator or new player. The game is effectively abandoned.

**Gungi-specific:** Private room link is shared via URL. The room code is in the URL, but the player's seat identity is not. A returning player cannot prove they were Black or White.

**Why it happens:** Session identity is tied to the WebSocket `connectionId`, which changes on every new connection. Anonymous users have no persistent credential to identify themselves.

**Prevention:**
- On initial connection, issue a cryptographically random `sessionToken` (e.g., 128-bit UUID) to the client. Store it in `localStorage` (survives tab refresh) alongside the `roomId` and `playerSeat`.
- On every subsequent connection to that room, the client presents its `sessionToken`. The server looks up the token in the room's player registry and re-seats the returning player.
- `sessionToken` is a secret — do not include it in the URL (prevents seat-stealing via shared link). Store only in `localStorage`.
- Set an expiry on `sessionToken` relevance: a token is valid for re-seating only while the game is active (not ended). After game end, tokens for that room are irrelevant.
- Explicitly test: simulate a tab refresh mid-game and verify the player reconnects to their seat with full board state.

**Detection (warning signs):**
- Player identity is stored only as a property on the WebSocket connection object
- No `sessionToken` or equivalent in client `localStorage`
- Reconnect path does not check for an existing player seat before assigning a new one

**Phase to address:** Multiplayer / WebSocket phase (alongside reconnect logic).

---

### Pitfall 8: Browser Tab Backgrounding Kills the WebSocket

**What goes wrong:** Chrome and Firefox throttle JavaScript timers and heartbeats for background tabs. A player switches tabs for more than ~60 seconds. The WebSocket heartbeat misses its interval. The server detects no ping, closes the connection as stale. The player returns to find they've been disconnected — possibly with the game abandoned.

**Why it happens:** WebSocket keepalive implemented via `setInterval` on the client. Browser throttles `setInterval` to once per minute for background tabs (Chrome). If the heartbeat interval is 30 seconds, it effectively fires every 60 seconds in the background, which may exceed the server's timeout.

**Consequences:** Players lose games through no fault of their own. Creates a false "opponent abandoned" state.

**Prevention:**
- Set server-side WebSocket timeout generously: minimum 90 seconds, ideally 120 seconds. Do not default to framework presets (many default to 30 seconds).
- Use the Page Visibility API (`document.addEventListener('visibilitychange', ...)`) to detect tab re-focus. On re-focus, immediately send a ping and request a state resync if more than N seconds have elapsed.
- On server disconnect detection (no heartbeat), do not immediately end the game. Enter a "player disconnected" grace period of 60–120 seconds. Broadcast the grace period countdown to the opponent. Only abandon the game after the grace period expires.
- The grace period allows normal tab-background recovery without penalizing the player.

**Detection (warning signs):**
- Heartbeat `setInterval` set to < 60 seconds without Page Visibility API handling
- Server WebSocket timeout configured to < 90 seconds
- Game end triggered immediately on WebSocket `close` event without a grace period check

**Phase to address:** Multiplayer / WebSocket phase.

---

### Pitfall 9: Orphaned Rooms Accumulating in Server Memory

**What goes wrong:** Room objects, GameState, and WebSocket references accumulate in the server's room registry without being cleaned up. A room is created, one player joins and then leaves, the room sits empty forever. Or both players finish a game but the room object is never explicitly deleted.

**Why it happens:** Room creation is straightforward; room deletion requires tracking multiple exit conditions (both players leave, game ends, explicit close). Edge cases (one player never joins, server restart mid-game) are not anticipated.

**Consequences:** Memory grows unboundedly on a long-running server. In production, this manifests as a slow memory leak that causes server restarts every few hours.

**Prevention:**
- Explicit room lifecycle: rooms transition through `WAITING | ACTIVE | ENDED | EXPIRED` states. Only `ACTIVE` rooms keep full game state in memory.
- Add a sweep: a scheduled process (every 5–10 minutes) scans rooms for: (a) `WAITING` rooms older than 30 minutes with no second player — delete; (b) `ENDED` rooms older than 5 minutes — delete; (c) `ACTIVE` rooms where both connections have been closed for more than the grace period — mark `ENDED` then delete.
- If using a persistent store (Redis, database) for game state, room cleanup is less critical for memory, but still needed to prevent unbounded storage growth.

**Detection (warning signs):**
- Room creation code has no corresponding deletion code
- No TTL or expiry logic for rooms
- Server memory grows over hours during load testing

**Phase to address:** Multiplayer / WebSocket phase (room lifecycle design).

---

### Pitfall 10: Pawn Drop Restrictions Implemented Incompletely

**What goes wrong:** The rule "a Pawn cannot be dropped to give check or checkmate" and "a Pawn cannot be dropped into a file with a friendly Pawn" are partial rule sets. Developers implement one of the two, or implement them correctly for normal play but forget to enforce them during the Setup phase's drop mechanic.

**Gungi-specific:** The dead pawn rule ("a Pawn with no legal moves cannot be captured, acts as terrain") has no analog in chess or shogi. It is easy to forget that a dead pawn blocks movement like a friendly piece but cannot be captured, while the standard capture logic will treat all non-immune pieces as capturable.

**Why it happens:** These are three separate pawn-specific rules that appear similar but interact differently with the board state. They are typically added incrementally and each one has subtle gaps.

**Consequences:**
- A player drops a Pawn to immediately checkmate the opponent (illegal in Gungi, not in shogi)
- A player drops a Pawn in a file that already has a friendly Pawn (column restriction violated)
- Dead pawns are captured when they should be immune
- Dead pawns incorrectly block legal moves of pieces with range (e.g., Musketeer's forward slide is blocked by a dead pawn that should physically block but cannot be captured)

**Prevention:**
- Isolate pawn rules into a dedicated `pawnRules.ts` module with exhaustive tests for each sub-rule.
- `isLegalDrop(state, "Pawn", position)` runs all three checks: (1) no friendly pawn in target file, (2) drop does not give immediate check, (3) drop does not give immediate checkmate.
- `isDeadPawn(state, position)` returns true if the pawn at that position has zero legal moves. Dead pawn squares are included in movement-blocking calculations (sliding pieces stop before them, can't pass through) but excluded from capturable squares.
- Write explicit test scenarios for: pawn-drop checkmate attempt (must be rejected), pawn-drop check (must be allowed), pawn in same file (must be rejected), dead pawn interacts with Musketeer/Archer/Samurai range.

**Detection (warning signs):**
- No unit tests specifically for pawn drop restrictions
- The capture eligibility function does not special-case the dead pawn condition
- Pawn-drop restrictions only checked in Play phase, not Setup phase

**Phase to address:** Rule Engine phase.

---

### Pitfall 11: Tier-Dependent Movement Not Derived Dynamically

**What goes wrong:** The movement set for each piece is hard-coded per piece type (e.g., `KNIGHT_MOVES = [[2,1],[1,2],...]`). Tower height is not part of the lookup. The Knight's dramatic tier change (narrow-L only → full chess knight → full knight + 3-square orthogonal hops) is either partially implemented or incorrectly keyed on the wrong height.

**Variant:** After a piece drops onto a tower, the tower height changes, but the cached movement lookup for that piece was computed before the drop and is used for the rest of the turn.

**Why it happens:** Standard chess implementations define movement as a property of piece type. Adding tier as a dimension requires a 2D lookup `movementSet[pieceType][tier]` that developers may not build from the start.

**Consequences:** Pieces move incorrectly at higher tiers. The Cannon's transformation from "exactly 2 squares" to "full rook" to "Chinese cannon" is one of the most complex tier progressions — if implemented with tier-1 behavior only, the game is fundamentally wrong.

**Prevention:**
- Movement is always resolved at move-generation time as `getMovement(pieceType, currentTowerHeight)`. Never cache the movement set; always derive from current tower state.
- Represent the full movement table explicitly: a 2D lookup `MovementTable[PieceType][Tier]` where `Tier` is 1, 2, or 3 (tower height == tier). This makes the full movement matrix visible and testable in one place.
- Write one test per piece per tier (33 movement set tests minimum) that asserts the exact set of squares reachable from a fixed, unobstructed position.
- Add tests where tower height changes during a game and verifies the piece movement set changes accordingly.

**Detection (warning signs):**
- Movement defined per piece type without a tier/height dimension
- A `getMovement(piece)` function that does not take tower height as a parameter
- Cannon behavior is implemented the same way at tiers 1, 2, and 3

**Phase to address:** Rule Engine phase.

---

### Pitfall 12: Spy Mutual Capture Leaves a Half-Applied Board State

**What goes wrong:** The Spy's mutual capture is implemented as two independent events: first capture the defender (normal capture), then remove the attacker (Spy). If any code path checks game-ending conditions (check, end of turn) between these two operations, it evaluates an intermediate board state where neither piece is correctly placed.

**Specific failure:** If the Spy captures a piece that was giving check to the opponent's Marshal, the intermediate state (defender removed, Spy still present) looks like the check was cleared. But the Spy is supposed to also be removed, potentially re-exposing the Marshal.

**Why it happens:** Capture is implemented as `removeTopOf(targetPosition)`. Mutual capture adds a second call `removeTopOf(attackerPosition)`. They are called sequentially, not atomically.

**Prevention:**
- Mutual capture is a single `GameState` transition, not two. `applyMove` for a Spy attack must produce a `GameState` where both positions have had their top piece removed in one step.
- Post-move validation (check detection, end condition) always runs against the fully-resolved post-move `GameState`, never against intermediate states.
- No event system that fires "piece captured" hooks during the middle of a move application — those hooks should fire only after the final state is produced.

**Detection (warning signs):**
- `applyCapture` and `applyMove` are separate functions that can each trigger post-move hooks
- A "piece removed" event is emitted during move application rather than after

**Phase to address:** Rule Engine phase (move application), Game Logic phase (end condition checks).

---

## Moderate Pitfalls

---

### Pitfall 13: Fortress Immunity Not Propagated Through All Capture Code Paths

**What goes wrong:** Fortress cannot capture and cannot be captured. A new developer adds a "Cannon" capture rule and doesn't check for Fortress immunity. The Cannon tier-3 (Chinese cannon) jumps over pieces to capture — if it can jump over a Fortress and capture the piece behind it, that's correct. But if the Cannon captures the Fortress itself, that's wrong.

**Prevention:**
- Add `canCapture(state, attacker, target): boolean` as a gateway function that all capture code goes through. This function checks Fortress immunity (and any future immunity rules) in one place.
- Include Fortress-specific tests in the move generation test suite for every piece that has a capture mechanic.

**Phase to address:** Rule Engine phase.

---

### Pitfall 14: Room Code Collision in Private Rooms

**What goes wrong:** Room codes are short (6 characters, A-Z) for shareability. With enough rooms created, collisions occur. A player who generates a room code that already exists joins an in-progress game as a second player — effectively impersonating someone else's seat or disrupting an active game.

**Prevention:**
- When generating a room code, check that it does not already exist in active rooms before returning it to the client.
- Alternatively, use a longer code (10+ characters, alphanumeric, case-insensitive) with vanishingly low collision probability at expected usage scale.
- Never allow a room code to be reused for a different game session — once a game ends, that code is retired.

**Phase to address:** Multiplayer phase.

---

### Pitfall 15: Setup Phase End Condition Race (Consecutive Pass)

**What goes wrong:** Setup ends when both players consecutively pass. If Player A passes, then Player B passes, setup should end immediately. But if the server processes these events asynchronously and Player A submits another placement between their pass and the server's state-update broadcast, the consecutive pass counter may reset incorrectly.

**Prevention:**
- Model consecutive-pass state explicitly: `{ playerALastAction: "PASS" | "PLACE", playerBLastAction: "PASS" | "PLACE" }`. Setup ends when both are `PASS` simultaneously.
- Because actions are processed serially per-room (see Pitfall 6), there is no concurrency risk within a single room. The serial queue solves this for free.

**Phase to address:** Game Logic phase.

---

### Pitfall 16: Piece Count Validation Missing During Setup Drop

**What goes wrong:** Each player has exactly 1 Marshal, 9 Pawns, 6 Generals, etc. (34 total). The client tracks this, but the server does not validate it. A modified client drops 10 Pawns. The rule engine gets a board state with 10 Pawns, which may cause unexpected behavior (e.g., dead pawn logic applied to the 10th Pawn behaves in untested ways).

**Prevention:**
- Server tracks `capturedPieces` per player (pieces not yet placed during setup). During setup drop validation, verify `capturedPieces[player][pieceType] > 0` before allowing the drop.
- The same `capturedPieces` tracking is used during Play phase for the Drop mechanic.

**Phase to address:** Rule Engine phase / Game Logic phase.

---

## Minor Pitfalls

---

### Pitfall 17: Check Detection Performance on Checkmate Calculation

**What goes wrong:** Checkmate detection iterates all legal moves for the player in check, simulates each one, and checks `isInCheck` again. `isInCheck` itself iterates all opponent pieces and their movement sets. On a fully populated Gungi board, this is O(moves × pieces × movement_range). For a turn-based game this is perfectly fast, but if an overly defensive developer wraps it in redundant loops, it could spike noticeably.

**Prevention:**
- Profile check/checkmate detection before optimizing. For a 9×9 board with ≤34 pieces per side, brute-force is almost certainly sub-millisecond.
- Do not premature-optimize. If the engine is pure and well-tested, performance will be fine.

**Phase to address:** Rule Engine phase (note: optimize only if profiling shows it's needed).

---

### Pitfall 18: Sliding Piece Blocker Logic Inverted

**What goes wrong:** Sliding pieces (Musketeer, Archer tier 2+, Samurai, Cannon tier 2, Archer tier 3) stop at the first piece they encounter. The blocker check is inverted: "stop if the square is empty" rather than "stop if the square is occupied." The piece flies over all pieces and falls off the board.

**Prevention:**
- Extract a `generateSlidingMoves(state, from, direction, maxSteps)` utility function that handles the standard "walk until blocked or board edge" logic. Reuse it for all sliding pieces.
- Add a test for each sliding piece where a friendly piece blocks the path and verify the slider stops before the blocker. Add a separate test where an enemy piece is the blocker and verify the slider can capture on that square but not pass through.

**Phase to address:** Rule Engine phase.

---

### Pitfall 19: Reconnect Loop on Persistent Server Error

**What goes wrong:** The client's reconnect logic uses exponential backoff. But if the server is returning a validation error (e.g., "invalid sessionToken") rather than a network error, the client keeps retrying indefinitely, hammering the server.

**Prevention:**
- Distinguish retryable errors (network drop, server restart) from fatal errors (session expired, room not found, game already ended). On fatal errors, stop reconnecting and show a user-facing message.
- Error event from server must include a `code` field: `NETWORK_ERROR` vs. `SESSION_EXPIRED` vs. `ROOM_NOT_FOUND`. Client reconnect logic branches on this.

**Phase to address:** Multiplayer phase.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Data model design | Flat board array extended ad-hoc for towers | Define `Tower[][]` canonical state type first (Pitfall 1) |
| First piece movement impl | Tier lookup missing height dimension | Build `MovementTable[piece][tier]` from day 1 (Pitfall 11) |
| Capture implementation | Mutual Spy capture as two events | Single atomic `applyMove` transaction (Pitfall 12) |
| Check/checkmate | Only checking last-moved piece | Full board scan every state transition (Pitfall 4) |
| Drop mechanic | Pawn restrictions partially enforced | Dedicated `pawnRules.ts` with exhaustive tests (Pitfall 10) |
| Setup phase | No server-side state machine | `GamePhase` enum, server-owned transition (Pitfall 5) |
| WebSocket integration | Client-trusted move validation | Server re-validates every move (Pitfall 2) |
| Room management | Zombie rooms accumulate | Room lifecycle + cleanup sweep (Pitfall 9) |
| Reconnect handling | Anonymous player loses seat | `sessionToken` in localStorage (Pitfall 7) |
| Background tab behavior | Heartbeat throttled, false disconnect | 120s timeout + grace period (Pitfall 8) |
| Concurrent events | Race conditions on move submission | Per-room serial action queue (Pitfall 6) |
| Fortress rules | Immunity not checked in all capture paths | `canCapture()` gateway function (Pitfall 13) |

---

## Sources

Research confidence levels:

- State synchronization patterns (Pitfalls 2, 6): MEDIUM — multiple WebSocket architecture sources and game networking articles agree on authoritative server model; specifics are well-established patterns.
- Check/checkmate detection edge cases (Pitfall 4): HIGH — Chess Programming Wiki and practical engine development blogs document these specific failure modes.
- Shogi drop rule parallels (Pitfall 10): HIGH — Official shogi rule documentation confirms the analogous restrictions and implementation complexity.
- Session/reconnect patterns (Pitfalls 7, 8): MEDIUM — AWS official blog and WebSocket.org guidance confirms sessionToken approach; Chrome background tab throttling is a documented browser behavior.
- Orphaned room cleanup (Pitfall 9): MEDIUM — Multiple game framework docs (Colyseus, Socket.IO) and practical multiplayer guides address this; specifics are implementation pattern, not a single authoritative source.
- Gungi-specific rules (Pitfalls 3, 10, 11, 12, 13): HIGH — Rules from PROJECT.md are authoritative (user-provided). Pitfall analysis is derived from examining rule interactions, not external sources.
