import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGameStore } from '../../store/gameStore'

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function ensureGuestSession(): Promise<string> {
  // Check existing token in localStorage
  const existing = localStorage.getItem('gungi-session-token')
  if (existing) return existing

  // Create anonymous session via better-auth
  const res = await fetch('/api/auth/sign-in/anonymous', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({}),
  })

  if (!res.ok) throw new Error('Failed to create guest session')

  const data = await res.json()
  const token: string = data.token ?? data.session?.token ?? ''
  if (token) localStorage.setItem('gungi-session-token', token)
  return token
}

async function createRoom(): Promise<string> {
  const res = await fetch('/api/rooms', {
    method: 'POST',
    credentials: 'include',
  })
  if (!res.ok) throw new Error('Failed to create room')
  const data = await res.json()
  return data.roomCode as string
}

// ─── Component ────────────────────────────────────────────────────────────────

export const CreateRoom: React.FC = () => {
  const navigate = useNavigate()
  const setSessionToken = useGameStore((s) => s.setSessionToken)

  const [displayName, setDisplayName] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Initialize guest session on mount
  useEffect(() => {
    ensureGuestSession()
      .then((token) => setSessionToken(token))
      .catch((err) => console.error('Session init error:', err))
  }, [setSessionToken])

  const handleCreate = async () => {
    setLoading(true)
    setError(null)
    try {
      const token = await ensureGuestSession()
      setSessionToken(token)
      const roomCode = await createRoom()
      navigate(`/room/${roomCode}`, { state: { displayName: displayName || 'Guest' } })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const handleJoin = async () => {
    const code = joinCode.trim().toUpperCase()
    if (!code || code.length !== 6) {
      setError('Please enter a valid 6-character room code')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const token = await ensureGuestSession()
      setSessionToken(token)
      navigate(`/room/${code}`, { state: { displayName: displayName || 'Guest' } })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center"
      style={{
        background: 'linear-gradient(160deg, #1A0E00 0%, #0D0700 100%)',
      }}
    >
      {/* Title */}
      <div className="flex flex-col items-center mb-10">
        <h1
          className="text-5xl font-bold text-amber-400 mb-2"
          style={{ fontFamily: "'Noto Serif SC', serif" }}
        >
          軍儀
        </h1>
        <p className="text-amber-200/60 text-lg tracking-widest uppercase">Gungi Online</p>
      </div>

      {/* Card */}
      <div
        className="w-full max-w-sm flex flex-col gap-6 px-8 py-8 rounded-2xl border border-amber-700/30 shadow-2xl"
        style={{ background: 'linear-gradient(160deg, #2D1A06 0%, #1A0E00 100%)' }}
      >
        {/* Display name */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-amber-300/60">
            Your Name (optional)
          </label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Guest"
            maxLength={32}
            className="bg-stone-800/60 border border-amber-700/30 rounded-lg px-3 py-2
              text-amber-100 placeholder-amber-200/30 outline-none
              focus:border-amber-500/60 transition-colors text-sm"
          />
        </div>

        {/* Create room */}
        <button
          onClick={handleCreate}
          disabled={loading}
          className="w-full py-3 rounded-lg bg-amber-700 hover:bg-amber-600
            text-stone-950 font-bold text-sm tracking-wide transition-colors
            disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Creating...' : 'Create New Game'}
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-amber-700/30" />
          <span className="text-xs text-amber-400/40">or</span>
          <div className="flex-1 h-px bg-amber-700/30" />
        </div>

        {/* Join room */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-amber-300/60">
            Join with Code
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="XXXXXX"
              maxLength={6}
              className="flex-1 bg-stone-800/60 border border-amber-700/30 rounded-lg px-3 py-2
                text-amber-100 placeholder-amber-200/30 outline-none
                focus:border-amber-500/60 transition-colors text-sm font-mono tracking-widest"
            />
            <button
              onClick={handleJoin}
              disabled={loading || joinCode.length < 6}
              className="px-4 py-2 rounded-lg bg-stone-700 hover:bg-stone-600
                text-amber-200 text-sm font-semibold transition-colors
                disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Join
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <p className="text-xs text-red-400 text-center -mt-2">{error}</p>
        )}
      </div>
    </div>
  )
}
