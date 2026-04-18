import React, { useState } from 'react'

interface WaitingRoomProps {
  roomCode: string
}

export const WaitingRoom: React.FC<WaitingRoomProps> = ({ roomCode }) => {
  const [copied, setCopied] = useState(false)
  const shareUrl = `${window.location.origin}/room/${roomCode}`

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback: select input
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center gap-8"
      style={{ background: 'linear-gradient(160deg, #1A0E00 0%, #0D0700 100%)' }}
    >
      {/* Title */}
      <h1
        className="text-4xl font-bold text-amber-400"
        style={{ fontFamily: "'Noto Serif SC', serif" }}
      >
        軍儀
      </h1>

      {/* Card */}
      <div
        className="flex flex-col items-center gap-5 px-8 py-8 rounded-2xl
          border border-amber-700/30 shadow-2xl w-full max-w-sm"
        style={{ background: 'linear-gradient(160deg, #2D1A06 0%, #1A0E00 100%)' }}
      >
        {/* Waiting indicator */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-2 h-2 rounded-full bg-amber-500 animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
          <p className="text-amber-200/70 text-sm">Waiting for opponent...</p>
        </div>

        {/* Room code */}
        <div className="flex flex-col items-center gap-2 w-full">
          <p className="text-xs text-amber-300/50 uppercase tracking-wide font-semibold">
            Room Code
          </p>
          <div
            className="font-mono text-3xl font-bold text-amber-400 tracking-widest
              px-6 py-3 rounded-xl bg-stone-900/60 border border-amber-700/30 w-full text-center"
          >
            {roomCode}
          </div>
        </div>

        {/* Share link */}
        <div className="flex flex-col items-center gap-2 w-full">
          <p className="text-xs text-amber-300/50 uppercase tracking-wide font-semibold">
            Share Link
          </p>
          <div className="flex gap-2 w-full">
            <input
              readOnly
              value={shareUrl}
              className="flex-1 bg-stone-800/60 border border-amber-700/20 rounded-lg px-3 py-2
                text-xs text-amber-200/60 outline-none"
            />
            <button
              onClick={handleCopy}
              className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors
                ${copied
                  ? 'bg-green-700/60 text-green-200'
                  : 'bg-amber-700/50 hover:bg-amber-600/50 text-amber-200'
                }`}
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
