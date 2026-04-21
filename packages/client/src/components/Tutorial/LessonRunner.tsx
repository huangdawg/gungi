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
  /** Called when the player advances (after seeing the outro). */
  onAdvance: () => void
}

/**
 * Runs a single interactive or read-only lesson. Reuses the real Board and
 * ReservePanel components so what the player learns matches what they'll do
 * in a real game. Invalid moves cannot be clicked — we filter the engine's
 * legal-move set through the lesson's isValidMove predicate before passing it
 * to the Board.
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
  /** Most recent non-completing move — used to drive the soft-hint narrative. */
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
    setSoftHintLines(null)
  // freshState is derived from `lesson` so intentionally omit it from deps.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lesson])

  const isValidMove = lesson.isValidMove ?? (() => true)

  const filteredLegalMoves = useMemo(() => {
    if (complete || lesson.readOnly) return []
    return getLegalMoves(gameState).filter((m) => isValidMove(m, gameState))
  }, [gameState, complete, lesson.readOnly, isValidMove])

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
      // Single-player tutorial: pin black's turn until the lesson completes
      // — there's no opponent to make white's move.
      if (!done && newState.currentPlayer !== 'black') {
        newState = { ...newState, currentPlayer: 'black' }
      }
      setGameState(newState)
      setLastMove({ from: fromPos, to: toPos })
      clearSelection()
      if (done) {
        setComplete(true)
        setSoftHintLines(null)
      } else if (lesson.softHint) {
        const hint =
          typeof lesson.softHint === 'function'
            ? lesson.softHint(move, newState)
            : lesson.softHint
        setSoftHintLines(hint ?? null)
      }
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
      if (complete || lesson.readOnly) return

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
        if (destMoves.length > 1) {
          setPendingChoice({ moves: destMoves, from: selectedPosition, to: pos })
          return
        }
        executeMove(destMoves[0]!, selectedPosition, pos)
        return
      }

      selectPieceAt(pos, gameState)
    },
    [
      complete, lesson.readOnly, selectedReservePiece, selectedPosition,
      legalMoves, executeMove, clearSelection, selectPieceAt, gameState,
    ],
  )

  const handleReservePieceClick = useCallback(
    (piece: PieceType) => {
      if (complete || lesson.readOnly) return
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
    [complete, lesson.readOnly, selectedReservePiece, filteredLegalMoves, clearSelection],
  )

  // ── Narrative + footer ──
  const narrativeLines =
    complete && lesson.outro
      ? lesson.outro
      : softHintLines && !complete
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
  ) : (
    <div className="flex flex-col gap-2">
      <div className="text-[11px] text-amber-200/50 uppercase tracking-widest">
        {softHintLines ? 'Try again' : 'Make your move when ready'}
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
      {/* Narrative (left column) — narrower to leave room for board */}
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

          {/* Reserve */}
          <div className="flex flex-col gap-3 w-48">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
              <span className="text-xs text-amber-200/60">Your reserve</span>
            </div>
            <ReservePanel
              playerState={gameState.players.black}
              owner="black"
              isMyTurn={gameState.currentPlayer === 'black' && !complete}
              isMyPanel={gameState.currentPlayer === 'black'}
              selectedReservePiece={selectedReservePiece}
              onReservePieceClick={handleReservePieceClick}
              label="Reserve"
              mode={gameState.mode}
            />
          </div>

          {/* Board */}
          <div className="flex flex-col items-center gap-3">
            <Board
              gameState={gameState}
              playerColor="black"
              selectedPosition={selectedPosition}
              legalMoves={legalMoves}
              lastMove={lastMove}
              onCellClick={handleCellClick}
            />
          </div>
        </>
      )}
    </div>
  )
}
