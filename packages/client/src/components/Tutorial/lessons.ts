import { createInitialState } from '@gungi/engine'
import type { TutorialLesson } from './types'

/**
 * M2.1 ships one stub lesson end-to-end. More chapters land in M2.2+.
 *
 * Each lesson has intro/outro lines in both Komugi and Meruem voice. Tone:
 *   • Komugi — soft, hesitant, encouraging, slight self-deprecation.
 *   • Meruem — precise, imperious, rewards correct play with clipped praise.
 */
export const LESSONS: TutorialLesson[] = [
  {
    id: 'ch1-l1-first-piece',
    chapter: 1,
    chapterTitle: 'Orientation',
    title: 'Your first piece',
    intro: {
      komugi:
        "Um… before anything else, the Marshal must go down. It's… it's the piece you're protecting, so it goes first. Please place it anywhere in your home rows — the three rows nearest you. Whichever square feels right.",
      meruem:
        "The Marshal. First, always. Place it within your home rows — the three nearest your side. Choose any square. I am watching.",
    },
    outro: {
      komugi:
        "There. Your Marshal is on the board. That's… that's the beginning of every game of Gungi. Well done.",
      meruem:
        "Acceptable. Your Marshal stands. Every game begins thus.",
    },
    initialState: createInitialState('normal'),
    isValidMove: (move) => move.type === 'place' && move.piece === 'marshal',
    isComplete: (state) =>
      state.board.some((row) =>
        row.some((tower) =>
          tower?.some((p) => p.type === 'marshal' && p.owner === 'black'),
        ),
      ),
  },
]

export function findLesson(id: string): TutorialLesson | undefined {
  return LESSONS.find((l) => l.id === id)
}

export function nextLesson(id: string): TutorialLesson | undefined {
  const idx = LESSONS.findIndex((l) => l.id === id)
  if (idx === -1 || idx === LESSONS.length - 1) return undefined
  return LESSONS[idx + 1]
}
