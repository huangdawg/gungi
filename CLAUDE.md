# Gungi Online

## Project

A web-based real-time multiplayer implementation of Gungi (軍儀) — the chess-like board game from Hunter x Hunter. Full rule engine, private room matchmaking, optional accounts, traditional HxH aesthetic.

See `.planning/PROJECT.md` for full context, requirements, and key decisions.

## GSD Workflow

This project uses the GSD planning system. Planning artifacts live in `.planning/`.

- **Current phase:** Phase 1 — Rule Engine
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

## Key Rules

- Rule engine is a **pure TypeScript module** — zero I/O, no framework deps, importable by both server and client
- Server is **always authoritative** — clients send intent, server validates and broadcasts
- Game state shape: `board: Tower[][]` where `Tower = Piece[]` (top = active piece)
- All rule functions must be pure: `(state, move) → state`
