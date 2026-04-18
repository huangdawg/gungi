# Technology Stack

**Project:** Gungi Online
**Researched:** 2026-04-17
**Confidence:** HIGH (all versions verified against npm/official sources)

---

## Recommended Stack

### Core Frontend

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| React | 19.2.5 | UI framework | Largest ecosystem, best TypeScript support, concurrent rendering for real-time updates. Svelte would be marginally faster, but the game board is not a performance bottleneck — the limiting factor is network round-trips. React's tooling (devtools, ecosystem, hiring pool) wins decisively for a complex rule engine. |
| Vite | 8.0.8 | Build tool / dev server | Fastest dev iteration loop. Vite 8 uses Rolldown+Oxc, giving sub-100ms cold starts. Create React App is dead. Next.js is overkill — SSR buys nothing for a real-time game behind a WebSocket connection. |
| TypeScript | 5.x (bundled with Vite) | Type safety | Non-negotiable for a complex rule engine with 11 piece types, 3 tiers, and stacking logic. Untyped JS will produce impossible-to-debug game rule regressions. |
| TailwindCSS | 4.1 | Styling | CSS-first config in v4, zero JS config file needed. Container queries built-in (useful for responsive board). Fastest iteration for the dark-wood, HxH aesthetic. |

### Real-Time / WebSocket Layer

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Socket.IO (server) | 4.8.3 | Real-time bidirectional communication | The correct choice for a turn-based board game. Native WebSockets are viable but Socket.IO adds automatic reconnection, packet buffering, room-based broadcasting, and fallback transports — all for a <15KB overhead that matters zero in a game where events fire ~10/minute, not 10,000/second. Rooms are a first-class concept, which maps directly to private game sessions. |
| socket.io-client | 4.8.3 | Frontend Socket.IO client | Paired with the server package; typed event emitters available via `socket.io-client`. |

**Why not PartyKit:** PartyKit is a managed cloud service layered on Cloudflare Workers. It reduces server ops burden but couples the architecture to Cloudflare and adds a paid dependency for a project that benefits from a self-hosted, stateful server with full control over game room lifetime. The added complexity also doesn't help vs Socket.IO's room primitives.

**Why not Colyseus:** Colyseus is well-suited for real-time action games needing delta-compressed state sync at 60fps. Gungi is a turn-based game where state changes only on player actions. Colyseus's schema system and room lifecycle add significant ceremony for no net benefit — the state sync you'd get from a simple `socket.emit('gameState', snapshot)` is all you need here.

**Why not Liveblocks / Ably:** Managed SaaS with per-connection pricing. Acceptable for collaboration tools, unnecessary for a self-hosted game with at most tens of concurrent rooms.

### Backend Framework

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Hono | 4.12.14 | HTTP server + REST API | Hono is faster than Express (55K req/s vs 15K req/s), has first-class TypeScript, runs on Node.js, and ships a `@hono/node-ws` WebSocket adapter. It is the correct modern choice for a greenfield Node.js API. Express is legacy — not wrong, but carries years of design debt. Fastify is an equally valid alternative; Hono wins on DX (no schema requirement for simple routes, cleaner middleware). |
| @hono/node-ws | 1.3.0 | WebSocket upgrade support for Hono+Node.js | Required adapter to use Socket.IO's underlying upgrade mechanism alongside Hono routes. |
| Node.js | 22 LTS | Runtime | LTS stability, required by Hono's node adapter (18+). Bun is appealing for performance but Socket.IO's Node.js adapter has tested better on Node.js; avoid runtime risk on v1. |

### Game State Management (Server)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| In-memory Map (native) | N/A | Active game room state | Each active game room is a plain TypeScript object in a `Map<roomCode, GameRoom>`. For a private-room-only game with no ranked matchmaking, in-memory state is the correct choice — it eliminates an entire infrastructure dependency (Redis), is trivially debuggable, and is sufficient until you need horizontal scaling (which requires Redis pub/sub adapter for Socket.IO, deferred to v2). |

**Why not Redis (yet):** Redis becomes necessary only when you run multiple server instances behind a load balancer. A single Node.js process on a $6/mo VPS handles hundreds of concurrent game rooms easily. Adding Redis for v1 is premature complexity. The migration path to Redis later is well-documented via `socket.io-redis-adapter`.

### Game State Management (Client)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Zustand | 5.0.12 | Client-side game state | Single store, 3KB bundle, no boilerplate. The game client needs one coherent store: `{ board, currentTurn, phase, myColor, selectedTile, legalMoves, capturedPieces }`. Zustand's flat store with action methods maps cleanly to Socket.IO event handlers that mutate state on incoming server messages. Jotai's atomic model is better for fine-grained UI reactivity (e.g., a dashboard with 50 independent counters), not a game board where the whole state changes on every move. Redux is overkill — the DevTools are nice but the ceremony is not worth it. |
| Immer | 10.x | Immutable state updates for Zustand | Zustand's recommended solution for nested state. The game board is a 9×9 grid with tower arrays — Immer's draft mutation syntax prevents accidental reference mutations that cause subtle rendering bugs. |

### Authentication

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| better-auth | 1.6.4 | Optional user accounts | Better-auth has a first-class Anonymous plugin that creates a persistent anon user ID (survives session expiry) and supports one-click upgrade to a real account by linking OAuth or email. This is exactly the "guests can play anonymously, accounts unlock history/identity" requirement. Lucia v3 is deprecated as of early 2025 — do not use it. NextAuth/Auth.js lacks a clean anonymous session primitive. |

**Anonymous plugin note:** There are open GitHub issues (as of April 2026) with the anonymous plugin's `after` hook in certain configurations. Use the plugin with an explicit `signIn` call pattern rather than relying on auto-signin. Test this early in the auth phase.

**Session strategy:** Use better-auth's database sessions (not JWTs) so that anonymous-to-registered account linking works without token reissue complexity.

### Database / ORM

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| PostgreSQL | 16 | Persistent storage | User accounts, optional game history. PostgreSQL is the only viable choice over SQLite once you have user accounts served over a network — SQLite's file-based access model is not safe for concurrent writes from multiple Node.js async contexts. |
| Drizzle ORM | 0.45.2 | Type-safe DB access | Drizzle generates SQL directly (no binary engine), has a 7.4KB bundle, and gives TypeScript inferences with zero extra codegen step. Prisma 7 closed most of its performance gap (TypeScript-native query compiler), but Drizzle's SQL-close mental model is better for a project where the schema is simple (users, sessions, game_history) and the developer wants full query visibility. Drizzle is the 2025 community default for new TypeScript projects that aren't building complex multi-tenant schemas. |

### Testing

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Vitest | 3.x | Unit tests | Required for the rule engine. The game rule engine (movement validation, stacking logic, check detection) MUST have comprehensive unit tests — bugs here are game-breaking and invisible until a specific position is reached. Vitest runs in the same Vite pipeline, zero config for TypeScript. |

---

## Full Dependency List

### Frontend (`client/`)

```bash
# Core
npm install react@19 react-dom@19
npm install zustand@5 immer@10
npm install socket.io-client@4

# Styling
npm install tailwindcss@4 @tailwindcss/vite

# Dev
npm install -D vite@8 @vitejs/plugin-react typescript vitest
```

### Backend (`server/`)

```bash
# Core
npm install hono @hono/node-server @hono/node-ws
npm install socket.io@4
npm install better-auth
npm install drizzle-orm pg
npm install -D drizzle-kit typescript vitest @types/pg
```

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Frontend framework | React 19 | Svelte 5 | Svelte's smaller bundle and compiler are genuine advantages, but React's ecosystem depth (debugging tools, component libraries for board UI, community) outweighs marginal perf gains in a turn-based game. |
| Frontend framework | React 19 | Next.js 15 | Next.js adds SSR/SSG infrastructure that provides zero benefit for a real-time app whose primary interface is a WebSocket-backed game board. Added complexity, no gain. |
| Real-time | Socket.IO | Colyseus | Colyseus is optimized for action games (60fps state delta sync). Gungi is turn-based; the abstraction cost of Colyseus's schema system outweighs benefits. Socket.IO rooms handle private matchmaking natively. |
| Real-time | Socket.IO | Raw `ws` package | `ws` is fine but you hand-write reconnection, heartbeat, and room broadcasting logic. Socket.IO gives all of this tested and production-hardened. |
| Real-time | Socket.IO | PartyKit | Managed cloud, Cloudflare-coupled, no self-host option in free tier. Unnecessary ops dependency. |
| Backend | Hono | Express | Express is legacy, no TypeScript-first design, 4–5x slower. Use Hono. |
| Backend | Hono | Fastify | Fastify is equally valid. Hono chosen for cleaner middleware DX and consistent WS adapter API. |
| State (client) | Zustand | Redux Toolkit | Redux Toolkit is excellent for large teams with complex state, but the boilerplate (slices, selectors, thunks) is not justified for a single-page game client. |
| State (client) | Zustand | Jotai | Jotai atoms shine for fine-grained independent subscriptions. A game board is a monolithic state snapshot where the entire board re-renders on each move — Zustand's single-store model is simpler. |
| Auth | better-auth | Lucia v3 | Deprecated March 2025. Do not use for new projects. |
| Auth | better-auth | Auth.js (NextAuth) | No anonymous session primitive; designed for OAuth-first workflows, not guest-first. |
| Database | PostgreSQL | SQLite | SQLite is unsafe for multi-user network writes. Acceptable for prototyping locally but must be PostgreSQL before any real deployment. |
| ORM | Drizzle | Prisma | Both are valid. Drizzle chosen for zero binary dependency, smaller bundle, and SQL-close mental model. Prisma 7 is now competitive but Drizzle has lower setup friction. |
| Game state (server) | In-memory Map | Redis | Redis is the right answer for horizontal scaling. That is not a v1 concern. Avoid premature infrastructure. |

---

## Architecture Deployment Notes

- **Frontend:** Static SPA deployed to Cloudflare Pages, Vercel, or any CDN.
- **Backend:** Single Node.js 22 process on a VPS (Hetzner CX22, ~$6/mo, 2 vCPU / 4GB handles hundreds of concurrent rooms). Containerize with Docker for repeatability.
- **Database:** Managed PostgreSQL (Neon free tier or Supabase free tier for v1; self-host if traffic grows).
- **Scaling path:** When you need >1 server instance, add `socket.io-redis-adapter` and a Redis cluster. This is a one-line change to the Socket.IO server config.

---

## Sources

- React 19.2.5 release: https://react.dev/versions
- Socket.IO 4.8.3 changelog: https://socket.io/docs/v4/changelog/4.8.0
- Hono 4.12.14 on npm: https://www.npmjs.com/package/hono
- @hono/node-ws 1.3.0: https://www.npmjs.com/package/@hono/node-ws
- Vite 8.0.8 releases: https://vite.dev/releases
- Zustand 5.0.12: https://www.npmjs.com/package/zustand
- Drizzle ORM 0.45.2: https://www.npmjs.com/package/drizzle-orm
- TailwindCSS 4.1 release: https://tailwindcss.com/blog/tailwindcss-v4
- better-auth 1.6.4: https://www.npmjs.com/package/better-auth
- better-auth anonymous plugin: https://better-auth.com/docs/plugins/anonymous
- Lucia deprecation: https://github.com/lucia-auth/lucia/discussions/1707
- Colyseus for turn-based: https://discuss.colyseus.io/topic/657
- Ably comparison (Liveblocks vs Socket.IO): https://ably.com/compare/liveblocks-broadcast-vs-socketio
- Drizzle vs Prisma 2026: https://makerkit.dev/blog/tutorials/drizzle-vs-prisma
- Authoritative server pattern: https://www.gabrielgambetta.com/client-server-game-architecture.html
