import React, { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TeacherPicker } from './TeacherPicker'
import { LessonRunner } from './LessonRunner'
import { RulesModal, RulesHelpButton } from '../Rules/RulesModal'
import { LESSONS, findLesson, nextLesson } from './lessons'
import {
  loadProgress,
  markLessonComplete,
  setCurrentLesson,
  setTeacher as persistTeacher,
} from './progress'
import type { Teacher, TutorialProgress } from './types'

type View =
  | { kind: 'picker' }
  | { kind: 'lesson'; lessonId: string }
  | { kind: 'complete' }

export const TutorialPage: React.FC = () => {
  const navigate = useNavigate()
  const [progress, setProgress] = useState<TutorialProgress>(() => loadProgress())
  const [rulesOpen, setRulesOpen] = useState(false)

  const [view, setView] = useState<View>(() => {
    const p = loadProgress()
    if (!p.teacher) return { kind: 'picker' }
    const resumeId = p.currentLessonId ?? LESSONS[0]!.id
    return { kind: 'lesson', lessonId: resumeId }
  })

  const teacher = progress.teacher

  const handlePickTeacher = useCallback((t: Teacher) => {
    const next = persistTeacher(t)
    setProgress(next)
    setView({ kind: 'lesson', lessonId: LESSONS[0]!.id })
  }, [])

  const handleAdvance = useCallback(() => {
    if (view.kind !== 'lesson') return
    const current = findLesson(view.lessonId)
    if (!current) return
    const nextP = markLessonComplete(current.id)
    setProgress(nextP)

    const upcoming = nextLesson(current.id)
    if (upcoming) {
      const p2 = setCurrentLesson(upcoming.id)
      setProgress(p2)
      setView({ kind: 'lesson', lessonId: upcoming.id })
    } else {
      setView({ kind: 'complete' })
    }
  }, [view])

  const handleChangeTeacher = useCallback(() => {
    setView({ kind: 'picker' })
  }, [])

  // ─── Early views ───
  if (view.kind === 'picker' || !teacher) {
    return <TeacherPicker onPick={handlePickTeacher} />
  }

  if (view.kind === 'complete') {
    return (
      <TutorialCompleteScreen
        teacher={teacher}
        onReplay={() => setView({ kind: 'lesson', lessonId: LESSONS[0]!.id })}
        onExit={() => navigate('/')}
      />
    )
  }

  const lesson = findLesson(view.lessonId)
  if (!lesson) {
    // Defensive: stored lesson id is stale. Reset to first.
    setView({ kind: 'lesson', lessonId: LESSONS[0]!.id })
    return null
  }

  const lessonIdx = LESSONS.findIndex((l) => l.id === lesson.id)
  const totalLessons = LESSONS.length

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: 'linear-gradient(160deg, #120900 0%, #0A0500 100%)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-amber-700/20">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="text-amber-200/40 hover:text-amber-200/70 text-xs transition-colors"
          >
            ← Exit
          </button>
          <span
            className="text-xl font-bold text-amber-400"
            style={{ fontFamily: "'Noto Serif SC', serif" }}
          >
            軍儀
          </span>
          <span className="text-xs text-amber-200/40 uppercase tracking-widest">
            Tutorial · Chapter {lesson.chapter} · {lesson.chapterTitle}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <ProgressBar current={lessonIdx + 1} total={totalLessons} />
          <button
            onClick={handleChangeTeacher}
            className="text-[11px] text-amber-300/50 hover:text-amber-200 uppercase tracking-widest transition-colors"
          >
            Change teacher
          </button>
          <RulesHelpButton onClick={() => setRulesOpen(true)} />
        </div>
      </div>

      {/* Title */}
      <div className="px-4 pt-3 pb-1">
        <h2 className="text-sm text-amber-200/70 uppercase tracking-widest">
          Lesson {lessonIdx + 1} — {lesson.title}
        </h2>
      </div>

      <LessonRunner
        lesson={lesson}
        teacher={teacher}
        onAdvance={handleAdvance}
      />

      <RulesModal open={rulesOpen} onClose={() => setRulesOpen(false)} />
    </div>
  )
}

// ─── Subcomponents ────────────────────────────────────────────────────────────

const ProgressBar: React.FC<{ current: number; total: number }> = ({ current, total }) => (
  <div className="flex items-center gap-2">
    <div className="flex items-center gap-1">
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className="inline-block w-1.5 h-1.5 rounded-full"
          style={{ background: i < current ? '#E8C87C' : '#4a2e15' }}
        />
      ))}
    </div>
    <span className="text-[10px] text-amber-200/50 uppercase tracking-widest">
      {current}/{total}
    </span>
  </div>
)

const TutorialCompleteScreen: React.FC<{
  teacher: Teacher
  onReplay: () => void
  onExit: () => void
}> = ({ teacher, onReplay, onExit }) => {
  const message = teacher === 'komugi'
    ? "Oh… that's everything I know how to teach right now. You'll pick up the rest as you play. I'm proud of you."
    : "You have absorbed what I have offered. The rest will come in battle. Go."

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center gap-6 px-6 text-center"
      style={{ background: 'linear-gradient(160deg, #120900 0%, #0A0500 100%)' }}
    >
      <h1
        className="text-3xl font-bold text-amber-400"
        style={{ fontFamily: "'Noto Serif SC', serif" }}
      >
        軍儀
      </h1>
      <p className="text-sm uppercase tracking-widest text-amber-200/60">
        Tutorial complete
      </p>
      <p className="max-w-md text-amber-100/85 italic leading-relaxed">
        “{message}”
      </p>
      <div className="flex gap-3">
        <button
          onClick={onReplay}
          className="px-4 py-2 rounded-lg bg-stone-800/70 hover:bg-stone-700/70 text-amber-200 text-sm border border-amber-700/30 transition-colors"
        >
          Replay tutorial
        </button>
        <button
          onClick={onExit}
          className="px-4 py-2 rounded-lg bg-amber-600/40 hover:bg-amber-500/50 text-amber-100 text-sm font-semibold border border-amber-400/50 transition-colors"
        >
          Play your first real game →
        </button>
      </div>
    </div>
  )
}
