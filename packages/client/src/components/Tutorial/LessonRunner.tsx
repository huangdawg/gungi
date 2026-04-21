import React, { useCallback, useEffect, useMemo, useState } from 'react'
import type { GameState, Move, Position, PieceType } from '@gungi/engine'
import { applyMove, getLegalMoves, createInitialState } from '@gungi/engine'
import { Board } from '../Board/Board'
import { ReservePanel } from '../Reserve/ReservePanel'
import { MoveChoiceModal } from '../Board/MoveChoiceModal'
import { NarrativePane } from './NarrativePane'
import type { Teacher, TeacherLines, TutorialLesson } from './types'

interface LessonRunnerProps {
  lesson: TutorialLesson
  teacher: Teacher
  onAdvance: () => void
}

// Generic "that wasn't it" lines used when a lesson doesn't define its own softHint.
const DEFAULT_SOFT_HINT: TeacherLines = {
  komugi:
    "Um… that's a real move, but it wasn't quite what this lesson was asking for. Could you press Start over and try again?",
  meruem:
    "A permitted move, but not the task. Reset. Execute correctly.",
}

/**
 * Runs a single lesson. Engine sees the real, unfiltered legal moves so the
 * board feels like a real game. Lessons restrict WHICH piece is clickable
 * (via isValidMove) but not which move-type — the stack-vs-capture modal
 * appears naturally, and any move the engine accepts is something the player
 * can attempt.
 *
 * If the resulting state doesn't satisfy the lesson's isComplete, the lesson
 * locks: the narrative switches to a soft correction, and further clicks are
 * ignored until the player presses Start over.
 */
export const LessonRunner: React.FC<LessonRunnerProps> = ({
  lesson,
  teacher,
  onAdvance,
}) => {
  const freshState = () => lesson.initialState ?? createInitialState('normal')

  const [gameState, setGameState] = useState<GameState>(freshState)
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null)
  const [selectedReservePiece, setSelectedReservePiece] = useState<PieceType | null>(null)
  const [legalMoves, setLegalMoves] = useState<Move[]>([])
  const [lastMove, setLastMove] = useState<{ from: Position | null; to: Position } | null>(null)
  const [pendingChoice, setPendingChoice] = useState<{
    moves: Move[]
    from: Position | null
    to: Position
  } | null>(null)
  const [complete, setComplete] = useState(false)
  /** True after a non-completing move; disables further interaction until reset. */
  const [locked, setLocked] = useState(false)
  const [softHintLines, setSoftHintLines] = useState<TeacherLines | null>(null)

  // Reset when lesson changes
  useEffect(() => {
    setGameState(lesson.initialState ?? createInitialState('normal'))
    setSelectedPosition(null)
    setSelectedReservePiece(null)
    setLegalMoves([])
    setLastMove(null)
    setPendingChoice(null)
    setComplete(false)
    setLocked(false)
    setSoftHintLines(null)
  }, [lesson])

  const handleReset = useCallback(() => {
    setGameState(freshState())
    setSelectedPosition(null)
    setSelectedReservePiece(null)
    setLegalMoves([])
    setLastMove(null)
    setPendingChoice(null)
    setComplete(false)
    setLocked(false)
    setSoftHintLines(null)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lesson])

  const interactive = !complete && !locked && !lesson.readOnly

  const isValidMove = lesson.isValidMove ?? (() => true)

  const filteredLegalMoves = useMemo(() => {
    if (!interactive) return []
    return getLegalMoves(gameState).filter((m) => isValidMove(m, gameState))
  }, [gameState, interactive, isValidMove])

  const clearSelection = useCallback(() => {
    setSelectedPosition(null)
    setSelectedReservePiece(null)
    setLegalMoves([])
  }, [])

  const executeMove = useCallback(
    (move: Move, fromPos: Position | null, toPos: Position) => {
      const result = applyMove(gameState, move)
      if (!result.ok) return
      let newState = result.state
      const done = lesson.isComplete ? lesson.isComplete(newState) : true
      if (!done && newState.currentPlayer !== 'black') {
        newState = { ...newState, currentPlayer: 'black' }
      }
      setGameState(newState)
      setLastMove({ from: fromPos, to: toPos })
      clearSelection()
      if (done) {
        setComplete(true)
        setLocked(false)
        setSoftHintLines(null)
        return
      }
      // Wrong-but-legal move: lock the lesson and show a correction.
      const hint =
        typeof lesson.softHint === 'function'
          ? lesson.softHint(move, newState)
          : lesson.softHint
      setSoftHintLines(hint ?? DEFAULT_SOFT_HINT)
      setLocked(true)
    },
    [gameState, clearSelection, lesson],
  )

  const selectPieceAt = useCallback(
    (pos: Position, state: GameState) => {
      const tower = state.board[pos.row]?.[pos.col]
      const top = tower ? tower[tower.length - 1] : null
      if (!top || top.owner !== state.currentPlayer) {
        clearSelection()
        return
      }
      setSelectedPosition(pos)
      setSelectedReservePiece(null)
      setLegalMoves(
        filteredLegalMoves.filter(
          (m) => m.from && m.from.row === pos.row && m.from.col === pos.col,
        ),
      )
    },
    [clearSelection, filteredLegalMoves],
  )

  const handleCellClick = useCallback(
    (pos: Position) => {
      if (!interactive) return

      if (selectedReservePiece !== null) {
        const drop = legalMoves.find(
          (m) => m.type === 'place' && m.to.row === pos.row && m.to.col === pos.col,
        )
        if (drop) executeMove(drop, null, pos)
        else clearSelection()
        return
      }

      if (selectedPosition !== null) {
        const destMoves = legalMoves.filter(
          (m) => m.to.row === pos.row && m.to.col === pos.col,
        )
        if (destMoves.length === 0) {
          selectPieceAt(pos, gameState)
          return
        }
        const destHeight = gameState.board[pos.row]?.[pos.col]?.length ?? 0
        const confirm =
          destMoves.length > 1 ||
          (lesson.confirmAllOccupied && destHeight > 0)
        if (confirm) {
          setPendingChoice({ moves: destMoves, from: selectedPosition, to: pos })
          return
        }
        executeMove(destMoves[0]!, selectedPosition, pos)
        return
      }

      selectPieceAt(pos, gameState)
    },
    [
      interactive, selectedReservePiece, selectedPosition,
      legalMoves, executeMove, clearSelection, selectPieceAt, gameState, lesson,
    ],
  )

  const handleReservePieceClick = useCallback(
    (piece: PieceType) => {
      if (!interactive) return
      if (selectedReservePiece === piece) {
        clearSelection()
        return
      }
      setSelectedReservePiece(piece)
      setSelectedPosition(null)
      setLegalMoves(
        filteredLegalMoves.filter((m) => m.type === 'place' && m.piece === piece),
      )
    },
    [interactive, selectedReservePiece, filteredLegalMoves, clearSelection],
  )

  // ── Narrative + footer ──
  const narrativeLines =
    complete && lesson.outro
      ? lesson.outro
      : locked && softHintLines
        ? softHintLines
        : lesson.intro

  const footer = complete ? (
    <button
      onClick={onAdvance}
      className="w-full py-2 rounded-lg bg-amber-600/40 hover:bg-amber-500/50 text-amber-100 text-sm font-semibold transition-colors border border-amber-400/50"
    >
      Next →
    </button>
  ) : lesson.readOnly ? (
    <button
      onClick={onAdvance}
      className="w-full py-2 rounded-lg bg-amber-700/30 hover:bg-amber-600/40 text-amber-100 text-sm font-semibold transition-colors border border-amber-500/40"
    >
      Continue →
    </button>
  ) : locked ? (
    <button
      onClick={handleReset}
      className="w-full py-2 rounded-lg bg-amber-600/40 hover:bg-amber-500/50 text-amber-100 text-sm font-semibold transition-colors border border-amber-400/50"
    >
      Start over
    </button>
  ) : (
    <div className="flex flex-col gap-2">
      <div className="text-[11px] text-amber-200/50 uppercase tracking-widest">
        Make your move when ready
      </div>
      <button
        onClick={handleReset}
        className="w-full py-1.5 rounded-lg bg-stone-800/60 hover:bg-stone-700/60 text-amber-200/80 text-xs transition-colors border border-amber-700/30"
      >
        Start over
      </button>
    </div>
  )

  return (
    <div className="flex flex-1 items-start justify-center gap-4 px-4 py-4 flex-wrap">
      <div className="w-72 max-w-full flex-shrink-0">
        <NarrativePane teacher={teacher} lines={narrativeLines} footer={footer} />
      </div>

      {!lesson.readOnly && (
        <>
          {pendingChoice && (
            <MoveChoiceModal
              moves={pendingChoice.moves}
              onChoice={(m) => {
                executeMove(m, pendingChoice.from, pendingChoice.to)
                setPendingChoice(null)
              }}
              onCancel={() => setPendingChoice(null)}
            />
          )}

          <div className="flex flex-col gap-3 w-48">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
              <span className="text-xs text-amber-200/60">Your reserve</span>
            </div>
            <ReservePanel
              playerState={gameState.players.black}
              owner="black"
              isMyTurn={interactive && gameState.currentPlayer === 'black'}
              isMyPanel={gameState.currentPlayer === 'black'}
              selectedReservePiece={selectedReservePiece}
              onReservePieceClick={handleReservePieceClick}
              label="Reserve"
              mode={gameState.mode}
            />
          </div>

          <div className="flex flex-col items-center gap-3">
            <Board
              gameState={gameState}
              playerColor="black"
              selectedPosition={selectedPosition}
              legalMoves={legalMoves}
              lastMove={lastMove}
              onCellClick={handleCellClick}
              maxCellSize={60}
            />
          </div>
        </>
      )}
    </div>
  )
}
