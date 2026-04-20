import { apiUrl } from '../config'

const TOKEN_KEY = 'gungi-session-token'

/**
 * Returns the cached anonymous session token, or creates a new one via
 * better-auth and caches it in localStorage. Used by both the landing page
 * (CreateRoom) and the room page (GamePage) so that a friend opening the
 * share link in a fresh browser auto-provisions a guest session instead of
 * bouncing back to the home screen.
 */
export async function ensureGuestSession(): Promise<string> {
  const existing = localStorage.getItem(TOKEN_KEY)
  if (existing) return existing

  const res = await fetch(apiUrl('/api/auth/sign-in/anonymous'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({}),
  })

  if (!res.ok) throw new Error('Failed to create guest session')

  const data = await res.json()
  const token: string = data.token ?? data.session?.token ?? ''
  if (token) localStorage.setItem(TOKEN_KEY, token)
  return token
}
