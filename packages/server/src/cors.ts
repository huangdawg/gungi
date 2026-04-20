// Parse CLIENT_URL (comma-separated) into an allowlist for CORS.
// Defaults to the local Vite dev server so a fresh checkout works without env vars.

const DEFAULT_ALLOWED = ['http://localhost:5173']

export function getAllowedOrigins(): string[] {
  const raw = process.env.CLIENT_URL
  if (!raw) return DEFAULT_ALLOWED
  return raw
    .split(',')
    .map((s) => s.trim().replace(/\/$/, ''))
    .filter(Boolean)
}

/** Resolver for Hono's cors({ origin }). Returns the request origin if allowed, else null. */
export function honoOriginResolver(origin: string): string | null {
  const allowed = getAllowedOrigins()
  if (!origin) return allowed[0] ?? null
  return allowed.includes(origin.replace(/\/$/, '')) ? origin : null
}

/** Resolver for socket.io's cors.origin. */
export function socketOriginResolver(
  origin: string | undefined,
  cb: (err: Error | null, allow?: boolean) => void
): void {
  const allowed = getAllowedOrigins()
  if (!origin) return cb(null, true) // non-browser clients (curl, server-to-server) — let through
  cb(null, allowed.includes(origin.replace(/\/$/, '')))
}
