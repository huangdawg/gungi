# State — Gungi Online

## Project Reference

**Project**: Gungi Online
**Core Value**: A faithful, playable Gungi experience in the browser — all piece rules enforced correctly, stacking mechanics working, and two players able to start a game in under a minute via a shared link.
**Project file**: /Users/jonathanhuang/AI/.planning/PROJECT.md
**Requirements file**: /Users/jonathanhuang/AI/.planning/REQUIREMENTS.md
**Roadmap file**: /Users/jonathanhuang/AI/.planning/ROADMAP.md

## Current Position

**Current Phase**: 1 — Rule Engine
**Current Plan**: 1 (complete)
**Phase Status**: Complete
**Overall Progress**: 1/3 phases complete

```
Progress: [###       ] 33%
Phase 1: Rule Engine          [ Complete ]
Phase 2: Multiplayer Infra    [ Not started ]
Phase 3: Board UI             [ Not started ]
```

## Performance Metrics

| Metric | Value |
|--------|-------|
| Phases total | 3 |
| Phases complete | 1 |
| Requirements mapped | 24/24 |
| Requirements complete | 9/24 |
| Phase 1 duration | ~90 minutes |
| Phase 1 tests | 88 passing |
| Phase 1 files | 25 created |

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
| Dead pawn cannot be captured (immune) | Every on-board pawn is "dead" — acts as permanent terrain | Phase 1 implementation |
| Checkmate gated to hybrid phase only | Placement phase zero-move state is not a loss | Phase 1 bug fix |
| Tower = Piece[] (index 0 = bottom, last = top) | Locked in types.ts; all piece logic uses this invariant | Phase 1 types |

### Pitfalls to Watch

- Dead pawn immunity: canLandOn returns false for enemy pawns — do not break this in Phase 2 state persistence
- Checkmate is only checked in hybrid phase — server layer must enforce this too
- Spy mutual capture is atomic — both board and onBoardCount must update in same transaction
- Issue `sessionToken` (128-bit random) in `localStorage` — never use WebSocket `connectionId` as player identity
- Server owns `GamePhase` enum — setup phase cannot be validated client-side only
- Per-room serial action queue + `stateVersion` on every `GameState` to prevent race conditions

### Open Questions

| Question | Status |
|----------|--------|
| better-auth Anonymous plugin — test early for open issues with `after` hook | Open |
| Deployment target must be stateful persistent process (not serverless/edge) | Open |
| Move notation format — defined in Phase 1 as `"{kanji}{from}-{to}"` or `"{kanji}{from}x{to}"` | Resolved |

### Todos

- (None)

### Blockers

- (None)

## Session Continuity

**Last updated**: 2026-04-17
**Last action**: Phase 1 complete — rule engine implemented, 88 tests passing, committed 2d9f4d1
**Next action**: Run `/gsd-plan-phase 2` to plan Phase 2 (Multiplayer Infra)
**Mode**: yolo
**Granularity**: coarse
