# Gungi Online

## Project

A web-based real-time multiplayer implementation of Gungi (軍儀) — the chess-like board game from Hunter x Hunter. Full rule engine, private room matchmaking, optional accounts, traditional HxH aesthetic.

See `.planning/PROJECT.md` for full context, requirements, and key decisions.

## GSD Workflow

This project uses the GSD planning system. Planning artifacts live in `.planning/`.

- **Current phase:** All 3 phases complete — rule engine, multiplayer server, board UI all built and running
- **Roadmap:** `.planning/ROADMAP.md`
- **Requirements:** `.planning/REQUIREMENTS.md`

### Working on phases

```
/gsd-discuss-phase 1    # gather context and clarify approach
/gsd-plan-phase 1       # create PLAN.md for a phase
/gsd-execute-phase 1    # execute the plan
/gsd-verify-work 1      # verify phase goal was achieved
```

### Mode: YOLO

Auto-approve execution. No confirmation prompts needed during phase execution.

## Tech Stack

- **Frontend:** React 19 + Vite 8
- **Real-time:** Socket.IO 4.8
- **Backend:** Hono 4 (Node.js)
- **State:** Zustand 5 + Immer
- **Database:** PostgreSQL 16 + Drizzle ORM
- **Auth:** better-auth 1.6 (Anonymous plugin)
- **Testing:** Vitest 3

## Running Locally

```bash
# Postgres via Docker (run once)
docker run -d --name gungi-postgres -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=password -e POSTGRES_DB=gungi -p 5432:5432 postgres:16-alpine

# Start server (port 3001)
npm run dev --workspace=packages/server

# Start client (port 5173)
npm run dev --workspace=packages/client
```

Navigate to http://localhost:5173

## Custom Game Rules (deviations from standard Gungi)

- **Hybrid phase**: first 15 turns per player = mandatory placement; after both place 15, each turn = place OR move
- **Max 25 pieces per player** on board at once (34 total, 9 always in reserve)
- **Placement zones**: Pawns anywhere; non-Pawns only in own first 3 rows
- **Self-capture**: allowed, removes piece permanently (no return to reserve)
- **Stacking on occupied square**: choose stack OR capture when moving to any occupied square
- **Lieutenant and Counsel removed** from piece roster
- **Dead pawn** counts as Cannon tier-3 jump platform
- **All-moves-in-check = checkmate** (no stalemate draw)
- **Tier fill order**: tier 1 = top arc only; tier 2 = bottom two arcs; tier 3 = all three arcs

## Piece Kanji

帅 Marshal · 兵 Pawn · 大 General · 中 Major · 筒 Musketeer · 马 Knight · 士 Samurai · 炮 Cannon · 忍 Spy · 岩 Fortress · 弓 Archer

## Key Rules

- Rule engine is a **pure TypeScript module** — zero I/O, no framework deps, importable by both server and client
- Server is **always authoritative** — clients send intent, server validates and broadcasts
- Game state shape: `board: Tower[][]` where `Tower = Piece[]` (top = active piece)
- All rule functions must be pure: `(state, move) → state`
- Local 2-player mode at `/local` — no server needed, engine runs directly in browser
