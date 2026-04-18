# Roadmap — Gungi Online

## Phases

- [x] **Phase 1: Rule Engine** - Pure TypeScript game logic for all pieces, tower stacking, and win conditions
- [ ] **Phase 2: Multiplayer Infrastructure** - Real-time server, private rooms, sessions, auth, and end-game handling
- [ ] **Phase 3: Board UI** - Playable browser interface with board rendering, piece interaction, and game flow

## Phase Details

### Phase 1: Rule Engine
**Goal**: A fully tested, pure TypeScript rule engine that correctly enforces all Gungi game logic with no I/O dependencies
**Depends on**: Nothing
**Requirements**: ENGINE-01, ENGINE-02, ENGINE-03, ENGINE-04, ENGINE-05, ENGINE-06, ENGINE-07, ENGINE-08, ENGINE-09
**Success Criteria** (what must be TRUE):
  1. All 11 piece types move according to their tier-specific rules — a piece at height 1, 2, or 3 returns the correct legal destinations
  2. Tower stacking is enforced — a third piece cannot be added to a height-3 tower, and only the top piece can move or be captured
  3. Setup phase validates placements — pawn file restrictions, mandatory piece counts, and consecutive-pass termination are enforced
  4. Checkmate is detected — the engine correctly identifies when every legal move leaves the Marshal exposed, ending the game
  5. All special rules are enforced atomically — Spy mutual capture removes both pieces, Fortress cannot be captured, dead pawn blocks Cannon tier-3 jumps
**Plans**: TBD
**UI hint**: no

### Phase 2: Multiplayer Infrastructure
**Goal**: Two players can create and join a private room, play a full game in real time with session persistence, optional accounts, and proper end-game handling
**Depends on**: Phase 1
**Requirements**: ROOM-01, ROOM-02, ROOM-03, ROOM-04, AUTH-01, AUTH-02, AUTH-03, END-01, END-02, END-03
**Success Criteria** (what must be TRUE):
  1. A player can create a room and share a link or code; a second player can join that room and both are connected to the same game
  2. A player who refreshes the browser rejoins their in-progress game with their session intact — no manual re-entry required
  3. A guest can play anonymously with no sign-up; an account holder sees their display name and can view their game history
  4. A player can resign at any time, offer a draw, or have checkmate detected — in all cases a game-over screen shows the winner and outcome
  5. Both players can send and receive text chat messages during a game
**Plans**: TBD
**UI hint**: no

### Phase 3: Board UI
**Goal**: A fully playable browser UI with traditional HxH aesthetics where players can complete an entire game from setup through checkmate
**Depends on**: Phase 2
**Requirements**: UI-01, UI-02, UI-03, UI-04, UI-05
**Success Criteria** (what must be TRUE):
  1. The board renders as a 9x9 grid with dark wood aesthetic and Japanese-styled circular piece tokens displaying kanji
  2. A piece's tower height is visually distinct — the outer ring fills at 1/3, 2/3, and 3/3 segments to show height 1, 2, and 3
  3. Clicking a piece highlights all legal move destinations on the board; clicking a highlighted square executes the move
  4. The reserve panel shows all undeployed pieces available for drop, and a player can click a reserve piece then a valid square to place it
  5. After each move, the origin and destination squares are visually highlighted so both players can see the last move at a glance
**Plans**: TBD
**UI hint**: yes

## Progress Table

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Rule Engine | 1/1 | Complete | 2026-04-17 |
| 2. Multiplayer Infrastructure | 0/0 | Not started | - |
| 3. Board UI | 0/0 | Not started | - |
