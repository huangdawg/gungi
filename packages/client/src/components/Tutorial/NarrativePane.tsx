import React from 'react'
import type { Teacher, TeacherLines } from './types'

const TEACHER_STYLE: Record<
  Teacher,
  { accent: string; kanji: string; name: string; tagline: string }
> = {
  komugi: { accent: '#E8C87C', kanji: '盲', name: 'Komugi', tagline: 'teaches' },
  meruem: { accent: '#A24040', kanji: '王', name: 'Meruem', tagline: 'observes' },
}

interface NarrativePaneProps {
  teacher: Teacher
  lines: TeacherLines
  /** Optional CTA at the bottom. e.g. "Next →" after completion, or progress text. */
  footer?: React.ReactNode
}

export const NarrativePane: React.FC<NarrativePaneProps> = ({
  teacher,
  lines,
  footer,
}) => {
  const style = TEACHER_STYLE[teacher]
  const text = lines[teacher]

  return (
    <div
      className="flex flex-col gap-4 p-5 rounded-xl border"
      style={{
        background: 'rgba(18, 8, 0, 0.85)',
        borderColor: `${style.accent}40`,
      }}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold border-2 flex-shrink-0"
          style={{
            borderColor: style.accent,
            color: style.accent,
            fontFamily: "'Noto Serif SC', serif",
            background: `${style.accent}14`,
          }}
        >
          {style.kanji}
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-semibold" style={{ color: style.accent }}>
            {style.name}
          </span>
          <span className="text-[10px] text-amber-200/40 uppercase tracking-widest">
            {style.tagline}
          </span>
        </div>
      </div>

      <p className="text-sm text-amber-100/90 leading-relaxed whitespace-pre-line">
        {text}
      </p>

      {footer && <div className="pt-2 border-t border-amber-700/20">{footer}</div>}
    </div>
  )
}
