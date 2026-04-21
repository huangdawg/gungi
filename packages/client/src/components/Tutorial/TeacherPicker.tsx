import React from 'react'
import type { Teacher } from './types'

interface TeacherPickerProps {
  onPick: (teacher: Teacher) => void
}

/**
 * First-run choice screen. Two cards; tap one to start the tutorial with
 * that character's voice.
 */
export const TeacherPicker: React.FC<TeacherPickerProps> = ({ onPick }) => (
  <div
    className="min-h-screen flex flex-col items-center justify-center gap-8 px-6"
    style={{ background: 'linear-gradient(160deg, #120900 0%, #0A0500 100%)' }}
  >
    <div className="text-center">
      <h1
        className="text-3xl font-bold text-amber-400 mb-2"
        style={{ fontFamily: "'Noto Serif SC', serif" }}
      >
        軍儀
      </h1>
      <p className="text-sm uppercase tracking-widest text-amber-200/60">
        Choose your teacher
      </p>
    </div>

    <div className="flex flex-col md:flex-row gap-5 max-w-3xl w-full">
      <TeacherCard
        accent="#E8C87C"
        kanji="盲"
        name="Komugi"
        tagline="The Gungi prodigy"
        blurb="“Um… I-I'll try my best to teach you. Please be patient with me.”"
        onClick={() => onPick('komugi')}
      />
      <TeacherCard
        accent="#A24040"
        kanji="王"
        name="Meruem"
        tagline="The King"
        blurb="“Pay attention. I will not repeat myself.”"
        onClick={() => onPick('meruem')}
      />
    </div>

    <p className="text-xs text-amber-200/40 max-w-md text-center leading-relaxed">
      You can change teacher later. Tutorial progress is saved locally.
    </p>
  </div>
)

const TeacherCard: React.FC<{
  accent: string
  kanji: string
  name: string
  tagline: string
  blurb: string
  onClick: () => void
}> = ({ accent, kanji, name, tagline, blurb, onClick }) => (
  <button
    onClick={onClick}
    className="flex-1 flex flex-col items-center gap-3 p-6 rounded-xl border transition-all
               bg-stone-950/50 hover:bg-stone-900/60 hover:-translate-y-0.5 text-left group"
    style={{ borderColor: `${accent}40` }}
  >
    <div
      className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold border-2"
      style={{
        borderColor: accent,
        color: accent,
        fontFamily: "'Noto Serif SC', serif",
        background: `${accent}14`,
      }}
    >
      {kanji}
    </div>
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-lg font-semibold" style={{ color: accent }}>
        {name}
      </span>
      <span className="text-xs text-amber-200/50 uppercase tracking-widest">
        {tagline}
      </span>
    </div>
    <p className="text-sm text-amber-100/70 italic text-center leading-relaxed">
      {blurb}
    </p>
  </button>
)
