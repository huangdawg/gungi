# syntax=docker/dockerfile:1.7
# Build context = repo root (so the Drizzle/engine workspaces are reachable).
# On Railway: leave service Root Directory at "/" and point Dockerfile Path to
# packages/server/Dockerfile (the root-level railway.json handles that).

FROM node:22-alpine
WORKDIR /app

# Install workspace deps. Copy every workspace's package.json so npm can resolve
# the workspace graph; the lockfile sits at the repo root.
COPY package.json package-lock.json ./
COPY packages/engine/package.json packages/engine/package.json
COPY packages/server/package.json packages/server/package.json
COPY packages/client/package.json packages/client/package.json
RUN npm ci

# Only the workspaces the server needs at runtime. We deliberately skip the
# client workspace source — its deps are already installed (npm hoists them),
# but we don't ship the React app source through the server image.
COPY packages/engine packages/engine
COPY packages/server packages/server

ENV NODE_ENV=production
ENV PORT=3001
EXPOSE 3001

WORKDIR /app/packages/server
# Run drizzle migrations on boot, then start Hono + Socket.IO via tsx (engine
# ships TS source, so tsx is the runtime — matches the dev script).
CMD ["sh", "-c", "npx tsx src/db/migrate.ts && npx tsx src/index.ts"]
