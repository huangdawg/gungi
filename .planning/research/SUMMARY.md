# Research Summary — Gungi Online

## Recommended Stack

Full TypeScript monorepo.

| Layer | Choice | Version | Rationale |
|-------|--------|---------|-----------|
| Frontend framework | React + Vite | 19 / 8 | Standard SPA — no SSR benefit for WebSocket games |
| Real-time | Socket.IO | 4.8 | Room primitives map directly to private sessions; built-in reconnect |
| HTTP backend | Hono | 4 | 4-5x faster than Express, TypeScript-native |
| Client state | Zustand + Immer | 5 | Single store, nested board mutations |
| Database | PostgreSQL + Drizzle ORM | 16 / 0.45 | Simple schema; Drizzle is SQL-close, zero codegen |
| Auth | better-auth (Anonymous plugin) | 1.6 | Guest-first sessions with optional account upgrade |
| Active room state | In-memory Maps | — | Single process handles hundreds of rooms; Redis deferred to v2 |
| Testing | Vitest | 3 | Rule engine needs tests from day one |

## Table Stakes Features (v1)

The v1 loop: two friends share a link → play a complete game → rules correctly enforced.

1. Rule engine (all 11 pieces, all 3 tiers, tower stacking)
2. Tower visualization (heights 1/2/3 visually distinct)
3. Setup phase UI (placement, consecutive-pass termination)
4. Shareable invite link / room code
5. Real-time board sync
6. Legal move highlighting
7. Reserve piece panel (unplaced pieces)
8. Resign + draw offer
9. Game over screen
10. In-game text chat
11. Reconnection on refresh (guest session resumption)

**Defer:** rematch button, spectator mode, persistent accounts, time controls, post-game replay.

**Do not build in v1:** ranked matchmaking, AI opponent, public lobby, tournaments.

## Architecture Pattern

**Authoritative server model.** Clients send intent; server validates via rule engine and broadcasts canonical `GameState`. No client-side move authority.

**Rule engine:** Pure TypeScript module (zero I/O). Imported by server for authoritative validation and by client read-only for move-hint highlighting. Single implementation, no drift.

**State shape:** `GameState { board: Tower[][], phase: GamePhase, ... }` where `Tower = Piece[]` (ordered stack, top = active). This is the core data model for both engine and wire protocol.

**Build order (strict dependency chain):**
1. Rule Engine (no dependencies — pure TS module)
2. Persistence + Room Infrastructure (HTTP lobby, session tokens, better-auth)
3. WebSocket Server + Engine Integration (Socket.IO, action queue, state broadcast)
4. Client Game UI (board renderer, Zustand store, Socket.IO client)
5. Lobby UI + End-to-End Integration (room creation/join, chat, game over)
6. Polish + v2 features

## Top Pitfalls

1. **No canonical state type** — Define `GameState` with `Tower[][]` before any piece rule. All rule functions must be pure: `(state, move) → state`.
2. **Tier dimension missing from movement lookup** — Build `MovementTable[PieceType][Tier]` from day one; always derive movement at call time from current tower height.
3. **Check detection only on last-moved piece** — After every state transition (including drops that change tower heights), scan the full board for all opponent attacks on the Marshal square.
4. **Spy mutual capture as two sequential ops** — Must be a single atomic operation; post-move validation runs only against the final state.
5. **Anonymous session identity lost on reconnect** — Issue a `sessionToken` (128-bit random) in `localStorage`; never use WebSocket `connectionId` as player identity.
6. **Setup phase validated client-side only** — Server owns `GamePhase` enum, validates every placement via rule engine.
7. **Race conditions on concurrent actions** — Per-room serial action queue + `stateVersion` on every `GameState` + `moveId` idempotency on each client event.

## Critical Open Questions

- **Dead pawn + Cannon tier-3:** Does a dead pawn count as the intervening piece for the Chinese cannon jump? Needs explicit ruling.
- **Stalemate vs. checkmate:** If all legal moves leave the Marshal exposed, is that checkmate or a loss condition? Affects check detection branching.
- **better-auth Anonymous plugin:** Known open issues with `after` hook — test early in Phase 2 before relying on it.
- **Deployment target:** Socket.IO requires a stateful persistent process (not serverless/edge) — confirm before Phase 3.
- **Move notation:** No standard Gungi notation exists — define a `Move` type format in Phase 1.

## Confidence

| Area | Level |
|------|-------|
| Stack | HIGH — all versions npm-verified |
| Features | HIGH — competitor analysis + PROJECT.md rules |
| Architecture | HIGH — established pattern for this game class |
| Pitfalls | HIGH — Gungi-specific from rule interaction analysis |
