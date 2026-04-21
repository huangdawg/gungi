import React, { useEffect, useState } from 'react'
import { RulesContent } from './RulesContent'

type Tab = 'start' | 'normal' | 'mini' | 'pieces'

const TABS: { id: Tab; label: string }[] = [
  { id: 'start',  label: 'Getting Started' },
  { id: 'normal', label: 'Normal' },
  { id: 'mini',   label: 'Mini' },
  { id: 'pieces', label: 'Piece Index' },
]

interface RulesModalProps {
  open: boolean
  onClose: () => void
}

/**
 * In-game rules reference. Slides in from the right, covers the right half of
 * the viewport on wider screens and near-full width on narrow screens. Same
 * content as the /rules route.
 *
 * Close: click backdrop, press Escape, or click the × button.
 */
export const RulesModal: React.FC<RulesModalProps> = ({ open, onClose }) => {
  const [tab, setTab] = useState<Tab>('start')

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex"
      aria-modal
      role="dialog"
      aria-label="Gungi rules reference"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Slide-over panel (right side) */}
      <div
        className="relative ml-auto h-full w-full max-w-3xl flex flex-col shadow-2xl border-l border-amber-700/40"
        style={{ background: 'linear-gradient(160deg, #120900 0%, #0A0500 100%)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-amber-700/30">
          <div className="flex items-center gap-3">
            <span
              className="text-lg font-bold text-amber-400"
              style={{ fontFamily: "'Noto Serif SC', serif" }}
            >
              軍儀
            </span>
            <span className="text-sm uppercase tracking-widest text-amber-200/60">
              Rules Reference
            </span>
          </div>
          <button
            onClick={onClose}
            aria-label="Close rules"
            className="text-amber-300/70 hover:text-amber-200 text-xl px-2 leading-none transition-colors"
          >
            ×
          </button>
        </div>

        <div className="flex gap-1 px-5 py-2 border-b border-amber-700/20 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={
                'px-3 py-1.5 rounded text-xs font-medium tracking-wide transition-colors whitespace-nowrap ' +
                (tab === t.id
                  ? 'bg-amber-700/40 text-amber-200 border border-amber-500/50'
                  : 'text-amber-300/60 hover:text-amber-300 border border-transparent')
              }
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="px-5 py-5">
            <RulesContent tab={tab} />
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Circle "?" button for placing in a game header. Opens the RulesModal.
 */
export const RulesHelpButton: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <button
    onClick={onClick}
    aria-label="Open rules reference"
    title="Rules reference"
    className="w-6 h-6 rounded-full border border-amber-500/50 text-amber-300/80
               hover:text-amber-200 hover:border-amber-400/70 hover:bg-amber-900/30
               text-xs font-bold leading-none transition-colors
               flex items-center justify-center"
  >
    ?
  </button>
)
