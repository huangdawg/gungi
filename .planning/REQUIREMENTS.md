# Requirements — Gungi Online

## v1 Requirements

### Rule Engine

- [ ] **ENGINE-01**: Rule engine enforces all 11 piece types with correct movement at each of 3 tower tiers
- [ ] **ENGINE-02**: Tower stacking is enforced — pieces stack up to max height 3; only top piece can move or be captured
- [ ] **ENGINE-03**: Setup phase is server-enforced — placements validated (pawn file restriction, mandatory piece counts, consecutive-pass termination at 18–26 pieces)
- [ ] **ENGINE-04**: Drop mechanic is enforced — player can place reserve pieces onto empty or friendly-occupied squares during their turn
- [ ] **ENGINE-05**: Pawn rules enforced — pawn cannot move or capture; dead pawn (no legal moves) cannot be taken; pawn cannot be dropped into check or checkmate; pawn cannot be dropped/moved into a file with a friendly pawn
- [ ] **ENGINE-06**: Spy mutual capture enforced — when Spy captures, both Spy and target are removed atomically
- [ ] **ENGINE-07**: Fortress rules enforced — Fortress cannot capture and cannot be captured; moves like a king
- [ ] **ENGINE-08**: Checkmate detection — game ends when the current player has no legal move that avoids Marshal capture (including all-moves-in-check = checkmate loss)
- [ ] **ENGINE-09**: Dead pawn counts as intervening piece for Cannon tier-3 (Chinese cannon) jump-to-capture

### Multiplayer & Rooms

- [ ] **ROOM-01**: User can create a private game room and receive a shareable link/code
- [ ] **ROOM-02**: User can join a game room via link or code
- [ ] **ROOM-03**: Player can reconnect to an in-progress game after refreshing the browser (guest session token in localStorage)
- [ ] **ROOM-04**: Players can send text messages to each other during a game

### Accounts

- [ ] **AUTH-01**: User can play as an anonymous guest with no sign-up required
- [ ] **AUTH-02**: User can optionally register an account to get a persistent display name
- [ ] **AUTH-03**: Logged-in user can view their game history

### Win / End Conditions

- [ ] **END-01**: Player can resign at any time; opponent wins
- [ ] **END-02**: Player can offer a draw; opponent can accept or decline
- [ ] **END-03**: Game over screen shows winner and outcome (checkmate / resign / draw)

### Board UI

- [ ] **UI-01**: Board renders a 9×9 grid with traditional HxH aesthetic (dark wood, Japanese-styled piece tokens)
- [ ] **UI-02**: Pieces display as circular poker-chip tokens with kanji; tower height shown via segmented outer ring (1/3, 2/3, 3/3 filled)
- [ ] **UI-03**: Clicking a piece highlights all legal move destinations
- [ ] **UI-04**: Reserve piece panel shows all unplaced pieces available for drop
- [ ] **UI-05**: Last move is highlighted (from/to squares)

## v2 Requirements (Deferred)

- Rematch button after game over
- Spectator mode (watch a game in progress)
- Time controls / chess clock
- Post-game move replay
- Animated piece transitions
- Ranked matchmaking / public lobby

## Out of Scope

- AI opponent — human vs human only
- Lieutenant piece — removed from roster
- Counsel piece — removed from roster
- Ranked matchmaking — private rooms only for v1
- Tournament/ladder system — future milestone

## Traceability

| REQ-ID | Phase | Status |
|--------|-------|--------|
| ENGINE-01 through ENGINE-09 | — | Unmapped |
| ROOM-01 through ROOM-04 | — | Unmapped |
| AUTH-01 through AUTH-03 | — | Unmapped |
| END-01 through END-03 | — | Unmapped |
| UI-01 through UI-05 | — | Unmapped |
