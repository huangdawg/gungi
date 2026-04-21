import React, { useCallback, useEffect, useState } from 'react'
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
import type { Teacher, TutorialLesson, TutorialProgress } from './types'

type View =
  | { kind: 'picker' }
  | { kind: 'lesson'; lessonId: string }
  | { kind: 'complete' }

export const TutorialPage: React.FC = () => {
  const navigate = useNavigate()
  const [progress, setProgress] = useState<TutorialProgress>(() => loadProgress())
  const [rulesOpen, setRulesOpen] = useState(false)
  const [lessonPickerOpen, setLessonPickerOpen] = useState(false)

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

  const handleJumpToLesson = useCallback((lessonId: string) => {
    const p = setCurrentLesson(lessonId)
    setProgress(p)
    setView({ kind: 'lesson', lessonId })
    setLessonPickerOpen(false)
  }, [])

  // ─── Early views ───
  if (view.kind === 'picker' || !teacher) {
    return <TeacherPicker onPick={handlePickTeacher} />
  }

  if (view.kind === 'complete') {
    return (
      <TutorialCompleteScreen
        teacher={teacher}
        onReplay={() => handleJumpToLesson(LESSONS[0]!.id)}
        onLessonPick={() => {
          // Return to last lesson but open the picker.
          setView({ kind: 'lesson', lessonId: LESSONS[LESSONS.length - 1]!.id })
          setLessonPickerOpen(true)
        }}
        onExit={() => navigate('/')}
      />
    )
  }

  const lesson = findLesson(view.lessonId)
  if (!lesson) {
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
            onClick={() => setLessonPickerOpen(true)}
            className="text-[11px] text-amber-300/80 hover:text-amber-200 uppercase tracking-widest transition-colors border border-amber-700/30 hover:border-amber-500/50 px-2 py-1 rounded"
          >
            Lessons
          </button>
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
      <LessonPickerModal
        open={lessonPickerOpen}
        onClose={() => setLessonPickerOpen(false)}
        progress={progress}
        currentLessonId={lesson.id}
        onPick={handleJumpToLesson}
      />
    </div>
  )
}

// ─── Lesson picker modal ──────────────────────────────────────────────────────

interface LessonPickerModalProps {
  open: boolean
  onClose: () => void
  progress: TutorialProgress
  currentLessonId: string
  onPick: (lessonId: string) => void
}

const LessonPickerModal: React.FC<LessonPickerModalProps> = ({
  open,
  onClose,
  progress,
  currentLessonId,
  onPick,
}) => {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const completed = new Set(progress.completedLessons)
  const hasFinished = LESSONS.every((l) => completed.has(l.id))

  // Chapter grouping
  const chapters: { chapter: number; chapterTitle: string; lessons: TutorialLesson[] }[] = []
  for (const l of LESSONS) {
    let ch = chapters.find((c) => c.chapter === l.chapter)
    if (!ch) {
      ch = { chapter: l.chapter, chapterTitle: l.chapterTitle, lessons: [] }
      chapters.push(ch)
    }
    ch.lessons.push(l)
  }

  const isClickable = (l: TutorialLesson) => {
    if (hasFinished) return true
    if (completed.has(l.id)) return true
    if (l.id === currentLessonId) return true
    // Also allow the next-in-sequence after the highest completed.
    const idx = LESSONS.findIndex((x) => x.id === l.id)
    const prev = idx > 0 ? LESSONS[idx - 1] : null
    return !!prev && completed.has(prev.id)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex"
      aria-modal
      role="dialog"
      aria-label="Lesson picker"
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative ml-auto h-full w-full max-w-md flex flex-col shadow-2xl border-l border-amber-700/40"
        style={{ background: 'linear-gradient(160deg, #120900 0%, #0A0500 100%)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-amber-700/30">
          <div className="flex flex-col">
            <span className="text-lg font-semibold text-amber-300">Lessons</span>
            <span className="text-[10px] text-amber-200/50 uppercase tracking-widest">
              {hasFinished
                ? 'Tutorial completed — jump anywhere'
                : `${completed.size} / ${LESSONS.length} completed`}
            </span>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-amber-300/70 hover:text-amber-200 text-xl px-2 leading-none transition-colors"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {chapters.map((ch) => (
            <div key={ch.chapter} className="mb-5">
              <div className="text-[11px] text-amber-400/70 uppercase tracking-widest mb-2">
                Chapter {ch.chapter} · {ch.chapterTitle}
              </div>
              <ul className="flex flex-col gap-1">
                {ch.lessons.map((l) => {
                  const isCurrent = l.id === currentLessonId
                  const isDone = completed.has(l.id)
                  const clickable = isClickable(l)
                  return (
                    <li key={l.id}>
                      <button
                        disabled={!clickable}
                        onClick={() => onPick(l.id)}
                        className={
                          'w-full text-left flex items-center gap-3 px-3 py-2 rounded transition-colors text-sm ' +
                          (isCurrent
                            ? 'bg-amber-700/30 text-amber-100 border border-amber-500/50'
                            : isDone
                              ? 'bg-stone-900/40 text-amber-200/85 hover:bg-stone-800/60 border border-amber-700/20'
                              : clickable
                                ? 'text-amber-200/70 hover:text-amber-200 hover:bg-stone-900/40 border border-amber-800/20'
                                : 'text-amber-200/25 cursor-not-allowed border border-transparent')
                        }
                      >
                        <span className="inline-flex w-5 justify-center text-xs">
                          {isCurrent ? '→' : isDone ? '✓' : clickable ? '·' : '◦'}
                        </span>
                        <span className="flex-1 truncate">{l.title}</span>
                        {l.readOnly && (
                          <span className="text-[9px] text-amber-200/40 uppercase tracking-wider">
                            read
                          </span>
                        )}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </div>

        <div className="px-5 py-3 border-t border-amber-700/30 text-[11px] text-amber-200/50 leading-snug">
          {hasFinished
            ? 'You\'ve completed the tutorial — every lesson is replayable from here.'
            : 'Complete lessons in order to unlock later ones. Completed lessons are always replayable.'}
        </div>
      </div>
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
  onLessonPick: () => void
  onExit: () => void
}> = ({ teacher, onReplay, onLessonPick, onExit }) => {
  const message = teacher === 'komugi'
    ? "Oh… that's everything I know how to teach right now. You can replay any lesson any time you want."
    : "You have absorbed what I have offered. Every lesson remains available to revisit. Go."

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
      <div className="flex flex-wrap gap-3 justify-center">
        <button
          onClick={onLessonPick}
          className="px-4 py-2 rounded-lg bg-stone-800/70 hover:bg-stone-700/70 text-amber-200 text-sm border border-amber-700/30 transition-colors"
        >
          Pick a lesson
        </button>
        <button
          onClick={onReplay}
          className="px-4 py-2 rounded-lg bg-stone-800/70 hover:bg-stone-700/70 text-amber-200 text-sm border border-amber-700/30 transition-colors"
        >
          Replay from start
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
