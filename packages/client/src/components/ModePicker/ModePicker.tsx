import React from 'react'
import type { GameMode } from '@gungi/engine'

interface ModePickerProps {
  onPick: (mode: GameMode) => void
  onCancel: () => void
}

/** Modal overlay prompting the user to choose between Normal and Mini Gungi. */
export const ModePicker: React.FC<ModePickerProps> = ({ onPick, onCancel }) => {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      style={{ background: 'rgba(10, 5, 0, 0.75)' }}
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-amber-700/40 shadow-2xl p-6 flex flex-col gap-4"
        style={{ background: 'linear-gradient(160deg, rgba(45,26,6,0.95) 0%, rgba(26,14,0,0.95) 100%)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          className="text-xl font-bold text-amber-200 text-center"
          style={{ fontFamily: "'Noto Serif SC', serif" }}
        >
          Choose a variant
        </h2>

        <button
          onClick={() => onPick('normal')}
          className="flex flex-col gap-1 items-start px-4 py-3 rounded-lg
            bg-amber-700/30 hover:bg-amber-600/40 border border-amber-600/40
            text-amber-100 transition-colors text-left"
        >
          <span className="font-semibold">Normal Gungi</span>
          <span className="text-xs text-amber-200/60">
            9×9 board · 34 pieces each · place 15 before hybrid
          </span>
        </button>

        <button
          onClick={() => onPick('mini')}
          className="flex flex-col gap-1 items-start px-4 py-3 rounded-lg
            bg-stone-700/40 hover:bg-stone-600/50 border border-stone-500/40
            text-amber-100 transition-colors text-left"
        >
          <span className="font-semibold">Mini Gungi</span>
          <span className="text-xs text-amber-200/60">
            5×5 board · 16 pieces each · place 9 before hybrid · faster games
          </span>
        </button>

        <button
          onClick={onCancel}
          className="self-center text-xs text-amber-400/50 hover:text-amber-300 mt-1"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
