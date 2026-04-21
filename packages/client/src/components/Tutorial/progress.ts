import type { TutorialProgress, Teacher } from './types'

const STORAGE_KEY = 'gungi:tutorial:progress:v1'

const defaultProgress: TutorialProgress = {
  teacher: null,
  completedLessons: [],
  currentLessonId: null,
}

export function loadProgress(): TutorialProgress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...defaultProgress }
    const parsed = JSON.parse(raw)
    return {
      teacher: parsed.teacher ?? null,
      completedLessons: Array.isArray(parsed.completedLessons) ? parsed.completedLessons : [],
      currentLessonId: parsed.currentLessonId ?? null,
    }
  } catch {
    return { ...defaultProgress }
  }
}

export function saveProgress(p: TutorialProgress): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p))
  } catch {
    // ignore (private mode, quota, etc.)
  }
}

export function setTeacher(teacher: Teacher): TutorialProgress {
  const p = loadProgress()
  const next: TutorialProgress = { ...p, teacher }
  saveProgress(next)
  return next
}

export function markLessonComplete(lessonId: string): TutorialProgress {
  const p = loadProgress()
  const completed = p.completedLessons.includes(lessonId)
    ? p.completedLessons
    : [...p.completedLessons, lessonId]
  const next: TutorialProgress = {
    ...p,
    completedLessons: completed,
    currentLessonId: lessonId,
  }
  saveProgress(next)
  return next
}

export function setCurrentLesson(lessonId: string): TutorialProgress {
  const p = loadProgress()
  const next: TutorialProgress = { ...p, currentLessonId: lessonId }
  saveProgress(next)
  return next
}
