# State — Gungi Online

## Project Reference

**Project**: Gungi Online
**Core Value**: A faithful, playable Gungi experience in the browser — all piece rules enforced correctly, stacking mechanics working, and two players able to start a game in under a minute via a shared link.
**Project file**: /Users/jonathanhuang/AI/.planning/PROJECT.md
**Requirements file**: /Users/jonathanhuang/AI/.planning/REQUIREMENTS.md
**Roadmap file**: /Users/jonathanhuang/AI/.planning/ROADMAP.md

## Current Position

**Current Phase**: 1 — Rule Engine
**Current Plan**: None (planning not started)
**Phase Status**: Not started
**Overall Progress**: 0/3 phases complete

```
Progress: [          ] 0%
Phase 1: Rule Engine          [ Not started ]
Phase 2: Multiplayer Infra    [ Not started ]
Phase 3: Board UI             [ Not started ]
```

## Performance Metrics

| Metric | Value |
|--------|-------|
| Phases total | 3 |
| Phases complete | 0 |
| Requirements mapped | 24/24 |
| Requirements complete | 0/24 |

## Accumulated Context

### Key Decisions

| Decision | Outcome | Source |
|----------|---------|--------|
| Rule engine first (no deps) | Phase 1 is pure TS module, no I/O | Research recommendation |
| Authoritative server model | Clients send intent; server validates via rule engine | Research architecture |
| Dead pawn counts as Cannon tier-3 platform | Dead pawn enables Chinese cannon jump | PROJECT.md ruling |
| All-moves-in-check = checkmate loss | No stalemate draw | PROJECT.md ruling |
| Lieutenant removed | Simplify piece set | PROJECT.md decision |
| Counsel removed | Simplify piece set | PROJECT.md decision |
| Anonymous guests must be supported | No sign-up required to play | PROJECT.md constraint |
| In-memory Maps for active room state | Single process; Redis deferred to v2 | Research recommendation |

### Pitfalls to Watch

- Define `GameState` with `Tower[][]` before any piece rule — no canonical state type = drift
- Build `MovementTable[PieceType][Tier]` from day one — tier dimension cannot be bolted on later
- After every state transition (including drops), scan full board for all opponent attacks on Marshal
- Spy mutual capture must be a single atomic operation
- Issue `sessionToken` (128-bit random) in `localStorage` — never use WebSocket `connectionId` as player identity
- Server owns `GamePhase` enum — setup phase cannot be validated client-side only
- Per-room serial action queue + `stateVersion` on every `GameState` to prevent race conditions

### Open Questions

| Question | Status |
|----------|--------|
| better-auth Anonymous plugin — test early for open issues with `after` hook | Open |
| Deployment target must be stateful persistent process (not serverless/edge) | Open |
| Move notation format — define `Move` type in Phase 1 | Open |

### Todos

- (None yet — populated during execution)

### Blockers

- (None)

## Session Continuity

**Last updated**: 2026-04-17
**Last action**: Roadmap created — 3 phases, 24/24 requirements mapped
**Next action**: Run `/gsd-plan-phase 1` to plan Phase 1 (Rule Engine)
**Mode**: yolo
**Granularity**: coarse
