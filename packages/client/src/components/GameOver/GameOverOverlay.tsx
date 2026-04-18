import React from 'react'
import type { Player } from '@gungi/engine'

interface GameOverOverlayProps {
  winner: Player | null
  reason: 'checkmate' | 'resigned' | 'draw' | 'forfeit'
  playerColor: Player
  onPlayAgain?: () => void
}

const REASON_TEXT: Record<string, string> = {
  checkmate: 'Checkmate',
  resigned: 'Resignation',
  draw: 'Draw Agreement',
  forfeit: 'Forfeit (Disconnect)',
}

export const GameOverOverlay: React.FC<GameOverOverlayProps> = ({
  winner,
  reason,
  playerColor,
  onPlayAgain,
}) => {
  const isDraw = reason === 'draw'
  const isWinner = winner === playerColor

  let title: string
  let titleColor: string
  if (isDraw) {
    title = 'Draw!'
    titleColor = 'text-amber-400'
  } else if (isWinner) {
    title = 'Victory!'
    titleColor = 'text-green-400'
  } else {
    title = 'Defeated'
    titleColor = 'text-red-400'
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Semi-transparent backdrop */}
      <div className="absolute inset-0 bg-stone-950/80 backdrop-blur-sm" />

      {/* Card */}
      <div
        className="relative z-10 flex flex-col items-center gap-4 px-10 py-8 rounded-2xl
          shadow-2xl border border-amber-700/50"
        style={{
          background: 'linear-gradient(160deg, #2D1A06 0%, #1A0E00 100%)',
        }}
      >
        {/* Winner announcement */}
        <h1 className={`text-5xl font-bold ${titleColor}`} style={{ fontFamily: "'Noto Serif SC', serif" }}>
          {title}
        </h1>

        {/* Winner name */}
        {!isDraw && winner && (
          <p className="text-xl text-amber-200">
            {winner.charAt(0).toUpperCase() + winner.slice(1)} wins
          </p>
        )}

        {/* Reason */}
        <p className="text-sm text-amber-300/60 uppercase tracking-widest">
          by {REASON_TEXT[reason] ?? reason}
        </p>

        {/* Divider */}
        <div className="w-32 h-px bg-amber-700/40" />

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={() => window.location.assign('/')}
            className="px-5 py-2 rounded-lg border border-amber-700/50 text-amber-300
              hover:bg-amber-700/20 transition-colors text-sm"
          >
            Home
          </button>
          {onPlayAgain && (
            <button
              onClick={onPlayAgain}
              className="px-5 py-2 rounded-lg bg-amber-600 hover:bg-amber-500
                text-stone-950 font-semibold transition-colors text-sm"
            >
              Play Again
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
