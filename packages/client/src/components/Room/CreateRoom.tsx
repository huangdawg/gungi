import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGameStore } from '../../store/gameStore'
import { apiUrl } from '../../config'
import { ensureGuestSession } from '../../api/session'
import { ModePicker } from '../ModePicker/ModePicker'
import type { GameMode } from '@gungi/engine'

// ─── Ukiyo-e background ───────────────────────────────────────────────────────

/** Ancient Japan art backdrop — translucent image with vignette for card readability. */
const UkiyoeBackdrop: React.FC = () => (
  <div className="pointer-events-none absolute inset-0 overflow-hidden select-none">
    {/* Background image, translucent */}
    <img
      src="/japan-background.webp"
      alt=""
      className="absolute inset-0 w-full h-full object-cover"
      style={{ opacity: 0.45 }}
    />
    {/* Warm dark tint — gives the image a sunset/ink mood and anchors the amber UI */}
    <div
      className="absolute inset-0"
      style={{
        background:
          'linear-gradient(180deg, rgba(20,10,2,0.55) 0%, rgba(30,15,5,0.35) 45%, rgba(15,8,2,0.65) 100%)',
      }}
    />
    {/* Vignette to focus the center card */}
    <div
      className="absolute inset-0"
      style={{
        background:
          'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.55) 100%)',
      }}
    />
  </div>
)

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function createRoom(mode: GameMode): Promise<string> {
  const res = await fetch(apiUrl('/api/rooms'), {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode }),
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
  /** Which flow the mode picker will feed into once a mode is chosen. */
  const [pickerFor, setPickerFor] = useState<'create' | 'local' | null>(null)

  // Initialize guest session on mount
  useEffect(() => {
    ensureGuestSession()
      .then((token) => setSessionToken(token))
      .catch((err) => console.error('Session init error:', err))
  }, [setSessionToken])

  const handleCreate = () => {
    setError(null)
    setPickerFor('create')
  }

  const handleLocal = () => {
    setError(null)
    setPickerFor('local')
  }

  const handleModePick = async (mode: GameMode) => {
    const target = pickerFor
    setPickerFor(null)
    if (!target) return
    if (target === 'local') {
      navigate(`/local?mode=${mode}`)
      return
    }
    // target === 'create'
    setLoading(true)
    try {
      const token = await ensureGuestSession()
      setSessionToken(token)
      const roomCode = await createRoom(mode)
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
      className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden"
      style={{
        background:
          'linear-gradient(180deg, #1B0E05 0%, #2A1408 32%, #54261A 60%, #7A3521 82%, #3A1A09 100%)',
      }}
    >
      {pickerFor !== null && (
        <ModePicker onPick={handleModePick} onCancel={() => setPickerFor(null)} />
      )}

      {/* ── Ancient Japan ukiyo-e backdrop ── */}
      <UkiyoeBackdrop />

      {/* Title */}
      <div className="relative z-10 flex flex-col items-center mb-10">
        <h1
          className="text-5xl font-bold text-amber-200 mb-2"
          style={{
            fontFamily: "'Noto Serif SC', serif",
            textShadow: '0 2px 12px rgba(0,0,0,0.75), 0 0 24px rgba(255,170,90,0.25)',
          }}
        >
          軍儀
        </h1>
        <p className="text-amber-100/80 text-lg tracking-widest uppercase"
          style={{ textShadow: '0 2px 8px rgba(0,0,0,0.7)' }}>
          Gungi Online
        </p>
      </div>

      {/* Card */}
      <div
        className="relative z-10 w-full max-w-sm flex flex-col gap-6 px-8 py-8 rounded-2xl border border-amber-700/40 shadow-2xl backdrop-blur-sm"
        style={{ background: 'linear-gradient(160deg, rgba(45,26,6,0.88) 0%, rgba(26,14,0,0.88) 100%)' }}
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

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-amber-700/30" />
          <span className="text-xs text-amber-400/40">or</span>
          <div className="flex-1 h-px bg-amber-700/30" />
        </div>

        {/* Local play */}
        <button
          onClick={handleLocal}
          className="w-full py-3 rounded-lg bg-stone-700/60 hover:bg-stone-600/60
            text-amber-200/70 font-semibold text-sm tracking-wide transition-colors border border-amber-700/20"
        >
          Play Locally (2 players, same device)
        </button>

        {/* Error */}
        {error && (
          <p className="text-xs text-red-400 text-center -mt-2">{error}</p>
        )}

        {/* Tutorial CTA — prominent full-width button for first-time players */}
        <button
          onClick={() => navigate('/tutorial')}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg
            bg-gradient-to-r from-amber-900/40 to-amber-800/30 hover:from-amber-800/50 hover:to-amber-700/40
            border border-amber-500/50 hover:border-amber-400/70
            text-left transition-all group"
        >
          <span
            className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold border-2 flex-shrink-0"
            style={{
              borderColor: '#E8C87C',
              color: '#E8C87C',
              fontFamily: "'Noto Serif SC', serif",
              background: '#E8C87C14',
            }}
          >
            盲
          </span>
          <div className="flex flex-col flex-1 min-w-0">
            <span className="text-sm font-semibold text-amber-200 leading-tight">
              New to Gungi?
            </span>
            <span className="text-xs text-amber-300/70 leading-tight">
              Learn to play — guided lessons from Komugi or Meruem
            </span>
          </div>
          <span className="text-amber-300/60 group-hover:text-amber-200 group-hover:translate-x-0.5 transition-all text-lg">
            →
          </span>
        </button>

        {/* Rules reference — subtle footer link */}
        <div className="flex justify-center -mt-2">
          <a
            href="/rules"
            className="text-xs text-amber-400/60 hover:text-amber-300 tracking-wide transition-colors"
          >
            Rules reference
          </a>
        </div>
      </div>
    </div>
  )
}
