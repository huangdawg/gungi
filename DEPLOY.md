# Deploy

Two supported targets:

- **Quick share with a friend (no deploy):** Cloudflare Tunnel (or ngrok) over the local dev server.
- **Persistent deploy:** Vercel (frontend) + Railway (backend) + Neon (Postgres).

---

## Option A — Tunnel for ad-hoc sharing (no deploy)

Run the local dev stack normally, then expose the Vite dev server (port 5173). Vite's proxy forwards `/api` and `/socket.io` to the server on 3001, so a single tunnel covers both.

```bash
# Terminal 1 — Postgres
docker start gungi-postgres   # or the docker run command from CLAUDE.md the first time

# Terminal 2 — server. CLIENT_URL must include the tunnel origin (see below).
npm run dev --workspace=packages/server

# Terminal 3 — client
npm run dev --workspace=packages/client
```

### Recommended: cloudflared (no signup)

```bash
brew install cloudflared
cloudflared tunnel --url http://localhost:5173
```

cloudflared prints a URL like `https://random-words-1234.trycloudflare.com`. Copy it, then **restart the server** with that origin appended to `CLIENT_URL` so CORS lets the tunnel through:

```bash
CLIENT_URL="http://localhost:5173,https://random-words-1234.trycloudflare.com" \
  npm run dev --workspace=packages/server
```

Hand the URL to your friend. Verified end-to-end: SPA loads, anonymous sign-in cookie sets, room creation succeeds, Socket.IO upgrades to a real websocket through the tunnel.

### Alternative: ngrok (requires free account)

```bash
brew install ngrok
# one-time: sign up at https://dashboard.ngrok.com/signup, copy your authtoken from
# https://dashboard.ngrok.com/get-started/your-authtoken, then:
ngrok config add-authtoken YOUR_TOKEN
ngrok http 5173
```

Same `CLIENT_URL` restart as above with the `https://*.ngrok-free.app` URL.

### Notes for both

- `vite.config.ts` sets `host: true` + `allowedHosts: true` so any tunnel host is accepted.
- Each fresh tunnel invocation gets a new hostname (free tier on both). Restart the server with the new URL each time, or pre-allow a list of recent hosts via comma-separated `CLIENT_URL`.
- Cookies cross the tunnel because better-auth uses `SameSite=Lax` and the tunnel is HTTPS.

---

## Option B — Persistent deploy (Neon + Railway + Vercel)

### 1. Provision Neon Postgres

1. Sign up at https://neon.tech and create a project.
2. Copy the **pooled** connection string (looks like `postgres://user:pass@ep-xxx-pooler.region.neon.tech/neondb?sslmode=require`).

### 2. Deploy the server to Railway

1. Push this repo to GitHub.
2. In Railway, **New Project → Deploy from GitHub repo** and select the repo.
3. Railway auto-detects `railway.json` at the repo root and uses `packages/server/Dockerfile`. Leave the service Root Directory as `/` (the default).
4. Set environment variables on the service:

   | Variable | Example value |
   |---|---|
   | `DATABASE_URL` | `postgres://...neon.tech/neondb?sslmode=require` |
   | `BETTER_AUTH_SECRET` | output of `openssl rand -base64 32` |
   | `BASE_URL` | `https://<your-service>.up.railway.app` (set after Railway gives you the domain) |
   | `CLIENT_URL` | `https://<your-vercel-app>.vercel.app,http://localhost:5173` |
   | `NODE_ENV` | `production` |
   | `PORT` | leave unset — Railway injects its own |

5. The first deploy will run drizzle migrations on boot (`tsx src/db/migrate.ts`) before starting the server.
6. Health check: `curl https://<service>.up.railway.app/health` → `{"status":"ok",...}`

### 3. Deploy the client to Vercel

1. Vercel → **Add New → Project**, import the GitHub repo.
2. **Root Directory:** `packages/client`. Vercel reads the `vercel.json` in that folder, which sets the SPA rewrite so React Router routes (`/room/ABC123`, `/local`) survive a hard refresh.
3. Build settings (Vercel auto-detects from `vercel.json`):
   - Framework: Vite
   - Build command: `npm run build`
   - Output directory: `dist`
   - Install command: `npm install --workspaces --include-workspace-root` (set via `vercel.json` so the engine workspace resolves)
4. Environment variable:

   | Variable | Value |
   |---|---|
   | `VITE_API_URL` | `https://<your-service>.up.railway.app` |

5. Deploy. After it succeeds, Vercel gives you a URL like `https://gungi.vercel.app`.

### 4. Wire CORS back together

Once the Vercel URL exists, go back to Railway and update `CLIENT_URL` to include it (comma-separated, no trailing slash):

```
CLIENT_URL=https://gungi.vercel.app
```

(Add `,http://localhost:5173` too if you also want to point a local dev client at the prod server.)

Railway will redeploy automatically on env-var change.

### 5. Sanity test

1. Open the Vercel URL in two different browsers (or one regular + one incognito).
2. Browser A: enter a name, **Create New Game**, copy the 6-character code.
3. Browser B: paste the code, **Join**.
4. Confirm both clients see the board, both can place a piece, and chat messages arrive in real time.
5. If the websocket fails: open devtools → Network → look for `socket.io/?EIO=4...`. A `200 OK` upgrade means transport is fine; a `403` or CORS error means `CLIENT_URL` on Railway is missing the Vercel origin.

---

## Local dev (regression check)

After any of the changes above, this still works as before — no env vars needed:

```bash
npm run dev --workspace=packages/server
npm run dev --workspace=packages/client
```

The client's `VITE_API_URL` is unset → it falls back to same-origin → Vite proxy forwards to `localhost:3001`.
