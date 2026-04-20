import React, { useEffect, useRef } from 'react'
import type { Move } from '@gungi/engine'

interface MoveChoiceModalProps {
  moves: Move[]
  onChoice: (move: Move) => void
  onCancel: () => void
}

export const MoveChoiceModal: React.FC<MoveChoiceModalProps> = ({
  moves,
  onChoice,
  onCancel,
}) => {
  const stackMove = moves.find(m => m.type === 'stack')
  const captureMove = moves.find(m => m.type === 'capture')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onCancel])

  return (
    <div
      data-game-surface
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={onCancel}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Modal */}
      <div
        ref={ref}
        className="relative z-10 flex flex-col gap-3 px-5 py-4 rounded-xl
          bg-stone-900 border border-amber-700/50 shadow-2xl shadow-black/60
          min-w-[200px]"
        onClick={e => e.stopPropagation()}
      >
        <p className="text-xs font-semibold uppercase tracking-widest text-amber-400/70 text-center">
          Choose action
        </p>

        {stackMove && (
          <button
            onClick={() => onChoice(stackMove)}
            className="flex items-center gap-3 px-4 py-2.5 rounded-lg
              bg-amber-800/30 hover:bg-amber-700/50 border border-amber-600/40
              text-amber-200 text-sm font-semibold transition-colors duration-100"
          >
            <span className="text-lg leading-none">⊕</span>
            <span>Stack on top</span>
          </button>
        )}

        {captureMove && (
          <button
            onClick={() => onChoice(captureMove)}
            className="flex items-center gap-3 px-4 py-2.5 rounded-lg
              bg-red-900/30 hover:bg-red-800/50 border border-red-600/40
              text-red-200 text-sm font-semibold transition-colors duration-100"
          >
            <span className="text-lg leading-none">✕</span>
            <span>Capture</span>
          </button>
        )}

        <button
          onClick={onCancel}
          className="text-xs text-amber-200/30 hover:text-amber-200/60 text-center
            transition-colors duration-100 mt-0.5"
        >
          Cancel (Esc)
        </button>
      </div>
    </div>
  )
}
