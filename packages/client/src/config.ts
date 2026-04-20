// Resolve the backend base URL.
// - In local dev (no env var), returns '' so requests stay same-origin and
//   ride the Vite proxy through to http://localhost:3001.
// - In deployed builds, set VITE_API_URL to the server origin (e.g. https://gungi-server.up.railway.app).
export const API_URL: string = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')

export function apiUrl(path: string): string {
  if (!path.startsWith('/')) path = '/' + path
  return `${API_URL}${path}`
}
