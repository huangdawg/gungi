import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { RulesContent } from './RulesContent'

type Tab = 'start' | 'normal' | 'mini' | 'pieces'

const TABS: { id: Tab; label: string }[] = [
  { id: 'start',  label: 'Getting Started' },
  { id: 'normal', label: 'Normal (9×9)' },
  { id: 'mini',   label: 'Mini (5×5)' },
  { id: 'pieces', label: 'Piece Index' },
]

/**
 * Full-page rules reference. Also renderable as a slide-over modal from inside
 * a game — see `<RulesModal>` which wraps this content.
 */
export const RulesPage: React.FC = () => {
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('start')

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: 'linear-gradient(160deg, #120900 0%, #0A0500 100%)' }}
    >
      {/* Sticky top block — header + tab bar stay pinned on scroll */}
      <div
        className="sticky top-0 z-20"
        style={{ background: 'linear-gradient(160deg, #120900 0%, #0A0500 100%)' }}
      >
        <div className="flex items-center justify-between px-6 py-3 border-b border-amber-700/30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="text-amber-400/70 hover:text-amber-300 text-sm transition-colors"
            >
              ← Home
            </button>
            <span
              className="text-xl font-bold text-amber-400"
              style={{ fontFamily: "'Noto Serif SC', serif" }}
            >
              軍儀
            </span>
            <span className="text-sm uppercase tracking-widest text-amber-200/60">
              Rules Reference
            </span>
          </div>
        </div>

        <div className="flex gap-1 px-6 py-2 border-b border-amber-700/20 overflow-x-auto">
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
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className={`mx-auto px-6 py-6 ${tab === 'pieces' ? 'max-w-6xl' : 'max-w-3xl'}`}>
          <RulesContent tab={tab} />
        </div>
      </div>
    </div>
  )
}
