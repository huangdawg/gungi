import React, { useState } from 'react'
import type { Player } from '@gungi/engine'

interface GameOverOverlayProps {
  winner: Player | null
  reason: 'checkmate' | 'resigned' | 'draw' | 'forfeit'
  playerColor: Player
  onPlayAgain?: () => void
  /** 'local' → neutral "Black wins · White loses". 'online' → Victory/Defeated from player perspective. */
  variant?: 'local' | 'online'
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
  variant = 'online',
}) => {
  const [minimized, setMinimized] = useState(false)

  const isDraw = reason === 'draw'
  const loser: Player | null = winner ? (winner === 'black' ? 'white' : 'black') : null

  // Title + accent color
  let title: string
  let titleColor: string
  let subtitle: React.ReactNode = null

  if (isDraw) {
    title = 'Draw'
    titleColor = 'text-amber-400'
  } else if (variant === 'local' && winner) {
    title = 'Game Over'
    titleColor = 'text-amber-400'
    subtitle = (
      <p className="text-lg text-amber-200 text-center">
        <span className="font-semibold">
          {winner.charAt(0).toUpperCase() + winner.slice(1)}
        </span>
        <span className="text-amber-200/70"> wins · </span>
        <span className="text-amber-200/60">
          {loser && (loser.charAt(0).toUpperCase() + loser.slice(1))}
        </span>
        <span className="text-amber-200/50"> loses</span>
      </p>
    )
  } else if (winner === playerColor) {
    title = 'Victory'
    titleColor = 'text-green-400'
  } else {
    title = 'Defeated'
    titleColor = 'text-red-400'
  }

  // Minimized chip — small corner badge, board fully visible
  if (minimized) {
    return (
      <button
        onClick={() => setMinimized(false)}
        className="fixed top-3 left-1/2 -translate-x-1/2 z-50
          flex items-center gap-2 px-3 py-1.5 rounded-full
          bg-stone-900/90 border border-amber-700/50 shadow-lg
          text-xs text-amber-200 hover:bg-stone-800/90 transition-colors
          backdrop-blur-sm"
      >
        <span className={`w-1.5 h-1.5 rounded-full ${titleColor.replace('text-', 'bg-')}`} />
        <span className="font-semibold">{title}</span>
        {!isDraw && winner && (
          <span className="text-amber-300/70">
            · {winner.charAt(0).toUpperCase() + winner.slice(1)} wins
          </span>
        )}
        <span className="text-amber-400/50 ml-1">show ▾</span>
      </button>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      {/* Floating card — board behind it stays visible and interactive-looking */}
      <div
        className="pointer-events-auto relative flex flex-col items-center gap-3 px-8 py-5 rounded-2xl
          shadow-2xl border border-amber-700/50 backdrop-blur-md"
        style={{
          background: 'linear-gradient(160deg, rgba(45, 26, 6, 0.92) 0%, rgba(26, 14, 0, 0.92) 100%)',
        }}
      >
        {/* Minimize button */}
        <button
          onClick={() => setMinimized(true)}
          aria-label="Hide game over card"
          className="absolute top-2 right-2 w-6 h-6 rounded-md flex items-center justify-center
            text-amber-200/50 hover:text-amber-200 hover:bg-stone-700/50 transition-colors text-xs"
        >
          ✕
        </button>

        {/* Title */}
        <h1
          className={`text-4xl font-bold ${titleColor} leading-none`}
          style={{ fontFamily: "'Noto Serif SC', serif" }}
        >
          {title}
        </h1>

        {/* Subtitle — variant-specific */}
        {subtitle ?? (!isDraw && winner && variant !== 'local' && (
          <p className="text-base text-amber-200">
            {winner.charAt(0).toUpperCase() + winner.slice(1)} wins
          </p>
        ))}

        {/* Reason */}
        <p className="text-[10px] text-amber-300/60 uppercase tracking-widest">
          by {REASON_TEXT[reason] ?? reason}
        </p>

        {/* Divider */}
        <div className="w-24 h-px bg-amber-700/40" />

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={() => setMinimized(true)}
            className="px-3 py-1.5 rounded-md border border-amber-700/40 text-amber-300/80
              hover:bg-amber-700/20 transition-colors text-xs"
          >
            View Board
          </button>
          <button
            onClick={() => window.location.assign('/')}
            className="px-3 py-1.5 rounded-md border border-amber-700/50 text-amber-300
              hover:bg-amber-700/20 transition-colors text-xs"
          >
            Home
          </button>
          {onPlayAgain && (
            <button
              onClick={onPlayAgain}
              className="px-3 py-1.5 rounded-md bg-amber-600 hover:bg-amber-500
                text-stone-950 font-semibold transition-colors text-xs"
            >
              Play Again
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
