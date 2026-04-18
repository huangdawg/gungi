# Gungi Online

## What This Is

A web-based implementation of Gungi (軍儀), the chess-like board game from Hunter x Hunter. Two players compete on a 9×9 board using stacked piece towers with unique height-dependent movement rules. Players can create private rooms and invite friends to play, with optional accounts for persistent identity.

## Core Value

A faithful, playable Gungi experience in the browser — all piece rules enforced correctly, stacking mechanics working, and two players able to start a game in under a minute via a shared link.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Full Gungi rule engine (all pieces, tower stacking, pawn rules, check/checkmate detection)
- [ ] Online multiplayer via private room + shareable link/code
- [ ] Optional accounts — guests can play anonymously, accounts unlock history/identity
- [ ] Traditional HxH visual style — dark wood board, 9×9 grid, Japanese-styled pieces
- [ ] Setup phase — players alternate placing pieces (18 mandatory, up to 26, consecutive pass ends setup)
- [ ] Drop mechanic — place undeployed pieces onto empty or friendly-occupied squares during your turn
- [ ] Tower visualization — stacked pieces visually shown as towers (max height 3)

### Out of Scope

- Ranked matchmaking — private rooms only for v1
- AI opponent — human vs human only for v1
- Lieutenant — removed from piece roster
- Counsel — removed from piece roster

## Context

Gungi is a fictional board game from the manga/anime Hunter x Hunter. Community-documented rules exist but the user is providing authoritative movement rules directly. The game is chess-like with significant differences: pieces stack into towers (height 1–3), a piece's movement depends on its tower height, the board starts empty and pieces are placed during a setup phase, and captured pieces are removed from the game permanently.

**Board:** 9×9 grid. Black side and White side (like shogi orientation).

**Piece roster (34 per player):**
- 1 Marshal
- 9 Pawns
- 6 Generals
- 4 Majors
- 2 Musketeers
- 2 Knights
- 2 Samurais
- 2 Cannons
- 2 Spies
- 2 Fortresses
- 2 Archers

**Movement rules by piece:**

| Piece | Tier 1 | Tier 2 | Tier 3 |
|-------|--------|--------|--------|
| Marshal | King (1 step any dir) | Same | Same |
| Pawn | Cannot move or capture | Same | Same |
| General | Move: 1 forward; Capture: 1 diag forward | Same | Same |
| Major | Move: 1 forward or 1 backward (vertical); Capture: 1 diag forward or 1 diag backward | Same | Same |
| Musketeer | Move+capture: any number forward (no backward) | Same | Same |
| Knight | Narrow L only (2+1 forward/backward, not wide) | Full chess knight (all 8 L-shapes) | Full knight + 3-square orthogonal hops |
| Samurai | Queen capped at 3 squares any direction | Same | Same |
| Cannon | Move+capture: exactly 2 squares orthogonally | Move+capture: full rook | Chinese cannon (rook to empty; captures by jumping over 1 piece) |
| Spy | 1-step ring (8 adjacent); mutual capture | 2-step ring only, hops over inner | 3-step ring only, hops over inner two |
| Fortress | King movement; cannot capture; cannot be captured | Same | Same |
| Archer | Bishop up to 2 spaces | Full bishop | Queen |

**Special rules:**
- Pawn cannot move or capture at any tier
- Dead pawn (pawn with no legal moves) cannot be taken; acts as board terrain
- Pawn cannot be dropped to give check or checkmate
- Pawn cannot be dropped into a file with a friendly pawn
- Pawn cannot move into a file with a friendly pawn
- Spy: when Spy captures, the Spy also dies (mutual capture)
- Fortress: immune to capture, cannot capture — tower use only
- Top piece of a tower is the only piece that can move or be captured
- Friendly lieutenant squares allow movement regardless of movement set (Lieutenant removed — N/A)
- Only top piece of a tower moves; pieces beneath are part of the 3D landscape

## Constraints

- **Tech**: Web app (browser-based)
- **Multiplayer**: Real-time online play via private rooms
- **Accounts**: Optional — anonymous guests must be supported

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Private rooms only (no matchmaking) | Simpler for v1; user's primary use case | — Pending |
| Lieutenant removed | User decision to simplify piece set | — Pending |
| Counsel removed | User decision to simplify piece set | — Pending |
| Authoritative piece rules from user | Anime game has inconsistent community docs | — Pending |
| Dead pawn counts as Cannon tier-3 platform | User ruling — dead pawn occupies square and enables Chinese cannon jump | ✓ Good |
| All-moves-in-check = checkmate (loss) | User ruling — no stalemate draw; player loses if every move leaves Marshal exposed | ✓ Good |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-17 after initialization*
