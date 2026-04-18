# Feature Landscape

**Domain:** Real-time multiplayer browser-based board game (chess-like, niche/fictional ruleset)
**Researched:** 2026-04-17

---

## Reference Platforms Studied

- **Lichess** — open-source, free, feature-rich chess platform
- **Chess.com** — commercial chess platform, largest user base
- **Board Game Arena (BGA)** — multi-game platform, real-time and async play
- **gungi.io** — existing Gungi implementation (direct competitor)

---

## Table Stakes

Features users expect from ANY online board game site. Missing one of these will cause players to leave or feel the product is unfinished.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Shareable invite link | Primary access flow — "send this link to a friend" is the entire UX for private rooms | Low | Generate a short code/URL, second player opens it and joins |
| Real-time board sync | Moves must appear instantly on both screens — any lag feels broken | Medium | WebSocket-based; state must be authoritative on server |
| Legal move enforcement | Players expect the game to stop illegal moves silently, not explain rules | High | Core rule engine; this is most of the engineering work |
| Resign button | Standard in every chess-like game; players need a graceful exit | Low | Triggers game end, declares winner |
| Draw offer / accept | Standard courtesy mechanic; expected by anyone who has played chess or shogi | Low | One player offers, other accepts or declines |
| In-game text chat | Players in the same room expect to be able to communicate | Low | Room-scoped chat only; no global chat needed for v1 |
| Whose turn indicator | At all times, both players must know whose turn it is | Low | Visual highlight + label |
| Piece move highlighting | Show which squares a selected piece can move to | Medium | Requires rule engine integration; critical for learning Gungi |
| Captured / reserve piece display | Players must see their undeployed pieces (drop mechanic makes this critical in Gungi) | Medium | Gungi-specific: reserve is used for drops, not just decoration |
| Game over screen | Clear win/loss/draw state with reason (checkmate, resign, draw) | Low | Blocking: without it, the game just freezes on end |
| Reconnection on refresh | If a player accidentally refreshes, they should re-enter the game in progress | Medium | Session token matched to room; rejoin via same URL |
| Guest play (no account required) | Accounts create friction; guests must be able to play | Low | Ephemeral identity scoped to the session |
| Move history / notation log | Players expect to see the sequence of moves in a scrollable list | Medium | Gungi has no standard notation — define one or adapt shogi-style |
| Tower visualization | Stacked pieces are core to Gungi; must be visually legible | High | Gungi-specific: render height-1/2/3 towers clearly |
| Setup phase UI | Gungi starts with a placement phase, not a pre-set board | High | Gungi-specific: alternate placement, pass mechanic, 18 mandatory pieces, 8 optional |

---

## Differentiators

Features that would set this Gungi implementation apart from existing options (gungi.io, community GitHub projects). Not needed for v1, but valuable for a second phase.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Spectator mode | Friends can watch a live game without participating | Medium | Requires broadcast of game state to additional socket connections; separate "spectator" role |
| Game replay | Review the full game after it ends, move-by-move | Medium | Requires persisting full move history to DB; replay UI with forward/back navigation |
| Persistent accounts with game history | Players can review past games, track win/loss record | Medium | Needs auth system + game history DB; guests can play but history is lost |
| Animated move transitions | Pieces glide to destination rather than snap | Low | Purely cosmetic; animating towers requires care |
| Board/piece theme options | Visual customization (dark wood, lighter aesthetic) | Low | CSS/asset swap; low complexity once base theme exists |
| HxH-themed visual design | Authentic manga aesthetic (Gon, Killua, dark wood board) | Medium | Illustration/asset work, not engineering — differentiates from chess.com reskins |
| Time controls (clock) | Optional chess clock per game (e.g. 10+0, 5+3) | Medium | Significant UX surface area; server must track and enforce; not needed for casual friend games |
| Takeback requests | Ask opponent to undo last move | Low | Standard feature on lichess; requires opponent consent; can be abused |
| Rematch button | After game ends, immediately start a new game in the same room | Low | High retention value; low complexity |
| Shareable game link (post-game) | Share a completed game as a link others can replay | Medium | Requires game persistence + replay UI |

---

## Anti-Features

Features to explicitly NOT build in v1 — either scope creep, complexity traps, or counter to the core value proposition.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Matchmaking / random opponent pairing | Out of scope per PROJECT.md; adds significant infrastructure (matchmaking queues, ELO, player pools) | Private rooms only; users invite a specific friend |
| AI opponent (bot) | Out of scope per PROJECT.md; Gungi rule engine complexity makes a good AI very hard; a bad AI disappoints users | Human vs human only |
| Public game browser / lobby | Increases moderation surface, requires persistent player presence, adds social complexity | Share a link directly |
| User profiles / social graph (followers, friends list) | Heavy feature; not needed when games are private and invite-based | Optional accounts give identity; no social layer |
| Tournaments | Large feature; depends on matchmaking, scheduling, bracket logic | Not in v1 scope |
| Analysis engine / move evaluation | Gungi has no Stockfish equivalent; would require building an AI first | Not feasible in v1 |
| Mobile-native app | Web app covers the use case; native app is a separate project | Responsive web design as a stretch goal |
| Global chat / community forums | Social infrastructure; not what users come for | In-game room chat only |
| Monetization / premium features | Premature; validate the core experience first | Build the game; worry about sustainability later |
| Variants / custom rules | There are already community rule disagreements; introducing variants fragments the tiny player base | Implement one authoritative ruleset (user-provided) |

---

## Feature Dependencies

Understanding what must exist before what can be built.

```
Rule engine (legal moves)
  → Board rendering
    → Move highlighting
      → Piece interaction (click/drag to move)
        → Real-time sync (WebSocket)
          → Room / invite link system
            → In-game chat
            → Resign / draw offer
            → Game over screen
            → Reconnection handling

Setup phase logic (placement rules)
  → Reserve / captured piece display
    → Drop mechanic UI

Move history persistence
  → Post-game replay
    → Shareable game link

Optional accounts (auth)
  → Game history per user
    → Win/loss stats
```

Key dependency: the rule engine is the prerequisite to almost everything. Nothing else can be built or tested without it. Setup phase is a distinct sub-system of the rule engine and should be considered a first-class component.

---

## MVP Recommendation

The v1 must deliver exactly one loop: two friends open a link, play a complete game of Gungi, and experience the rules correctly enforced.

**Prioritize (must ship):**
1. Rule engine — all pieces, all tiers, tower stacking, check/checkmate, setup phase, drop mechanic
2. Tower visualization — stacked pieces rendered legibly (height 1/2/3 visually distinct)
3. Setup phase UI — alternate placement, mandatory/optional piece counts, consecutive pass detection
4. Private room via shareable link — create room, generate URL, second player joins
5. Real-time board sync — moves reflected on both screens instantly
6. Legal move highlighting — click a piece, see valid moves
7. Reserve piece panel — show undeployed pieces available for drops
8. Resign + draw offer — graceful game termination
9. Game over screen — clear outcome display
10. In-game chat — minimal text channel for the two players
11. Reconnection on refresh — rejoin game via original URL

**Defer to phase 2:**
- Rematch button (high value but not blocking launch)
- Spectator mode (useful for demos but not core)
- Time controls (adds friction for casual friend games; not needed initially)
- Persistent game history (requires accounts; guest play is fine for v1)
- Post-game replay

**Do not build in v1:**
- Everything in Anti-Features above

---

## Gungi-Specific Feature Notes

These are not standard chess features — they are unique to Gungi and require deliberate design.

| Mechanic | Feature Implication |
|----------|---------------------|
| Tower stacking | UI must show stack height clearly; clicking a square with a tower must clarify top-piece identity; movement depends on height |
| Dead pawn (no legal moves, cannot be captured) | Rule engine must recognize dead pawn state and treat it as terrain, not a capturable piece |
| Mutual Spy capture | When Spy captures, both pieces are removed; the attacker dies too; UI must communicate this |
| Fortress immunity | Fortress cannot capture or be captured; visually should appear immovable |
| Drop mechanic | Reserve pieces can be placed on empty or friendly-occupied squares on your turn instead of moving; this is a separate action mode from move |
| Pawn drop restrictions | Pawn cannot be dropped to give check/checkmate; cannot be dropped into a file with a friendly pawn; engine must validate |
| Setup phase alternation | Players alternate placing pieces one at a time; consecutive passes by both players end setup; UI must handle the lobby-like waiting state before the main game begins |

---

## Existing Competition Notes (gungi.io)

Gungi.io is the most mature existing implementation. It features:
- Freemium model (3 games/day free, unlimited for Pro)
- ELO ranking and stats
- Bot opponent (Meruem)
- Game history (limited for free users)

**Competitive gap:** gungi.io appears to require an account and is oriented around ranked play. Our differentiation is zero-friction private rooms (share a link, play as a guest). The "play with a friend in under a minute" promise is not well-served by gungi.io's account-gated, ranked-game model.

---

## Sources

- Lichess features page: https://lichess.org/features
- Lichess GitHub (feature reference): https://github.com/lichess-org/lila
- Board Game Arena disconnect handling: https://forum.boardgamearena.com/viewtopic.php?t=23301
- gungi.io existing implementation: https://www.gungi.io/about
- gungi.io GitHub (legacy codebase): https://github.com/jwyce/gungi.io
- gungi.js TypeScript library: https://github.com/jwyce/gungi.js
- Chess.com play with friend: https://www.chess.com/play/online/friend
- chessu (open-source chess app, feature reference): https://github.com/dotnize/chessu
