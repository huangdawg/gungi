import type { GameState, Move } from '@gungi/engine'

export type Teacher = 'komugi' | 'meruem'

export interface TeacherLines {
  komugi: string
  meruem: string
}

/**
 * A tutorial lesson. Lessons run one of two modes:
 *
 *  1. readOnly=true  — narrative-only, player clicks "Next" to advance.
 *  2. readOnly=false — interactive; player must produce a valid move to advance.
 *                      Board legal-moves are filtered to `isValidMove`, so
 *                      illegal clicks simply do nothing (matches real gameplay).
 *                      Lesson completes once `isComplete(state)` returns true.
 */
export interface TutorialLesson {
  id: string
  chapter: number
  chapterTitle: string
  title: string
  /** Narrative shown when the lesson starts. */
  intro: TeacherLines
  /** Shown after the lesson completes, before advancing to next. */
  outro?: TeacherLines
  /** True = no interaction needed; Next button advances. */
  readOnly?: boolean
  /** Initial board state for interactive lessons. */
  initialState?: GameState
  /**
   * Filter applied on top of engine-legal moves. A move is offered to the
   * player only if this returns true. Default: accept any legal move.
   */
  isValidMove?: (move: Move, state: GameState) => boolean
  /**
   * Called after each successful move. Returns true when the lesson's goal
   * has been met. Default: any single move completes the lesson.
   */
  isComplete?: (state: GameState) => boolean
  /**
   * Shown in place of the intro narrative when a move was accepted by
   * `isValidMove` but didn't satisfy `isComplete`. The lesson is then locked
   * — the player cannot make further moves until they press Start over. If
   * omitted, a generic per-teacher message is used.
   */
  softHint?: TeacherLines | ((move: Move, state: GameState) => TeacherLines | undefined)

  /**
   * When true, a confirm modal is shown for any move onto an occupied
   * square — even if only one move-type is legal. Used after Chapter 3's
   * stack-or-capture lesson introduces the choice, so players build the
   * habit of confirming their intent (as in a real game).
   */
  confirmAllOccupied?: boolean
}

export interface TutorialProgress {
  teacher: Teacher | null
  completedLessons: string[]
  /** Id of the lesson the player is currently on (or last active). */
  currentLessonId: string | null
}
