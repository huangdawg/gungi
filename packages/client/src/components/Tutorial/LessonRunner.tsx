import React, { useCallback, useEffect, useMemo, useState } from 'react'
import type { GameState, Move, Position, PieceType } from '@gungi/engine'
import { applyMove, getLegalMoves, createInitialState } from '@gungi/engine'
import { Board } from '../Board/Board'
import { ReservePanel } from '../Reserve/ReservePanel'
import { MoveChoiceModal } from '../Board/MoveChoiceModal'
import { NarrativePane } from './NarrativePane'
import type { Teacher, TutorialLesson } from './types'

interface LessonRunnerProps {
  lesson: TutorialLesson
  teacher: Teacher
  /** Called when the player advances (after seeing the outro). */
  onAdvance: () => void
  /** Called when the player explicitly resets the lesson. */
  onReset?: () => void
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
  // ── Game state (lesson-scoped) ──
  const [gameState, setGameState] = useState<GameState>(
    () => lesson.initialState ?? createInitialState('normal'),
  )
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

  // Reset when lesson changes
  useEffect(() => {
    setGameState(lesson.initialState ?? createInitialState('normal'))
    setSelectedPosition(null)
    setSelectedReservePiece(null)
    setLegalMoves([])
    setLastMove(null)
    setPendingChoice(null)
    setComplete(lesson.readOnly ? false : false)
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
      setGameState(result.state)
      setLastMove({ from: fromPos, to: toPos })
      clearSelection()

      const done = lesson.isComplete
        ? lesson.isComplete(result.state)
        : true
      if (done) setComplete(true)
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

  // ── Narrative ──
  const narrativeLines = complete && lesson.outro ? lesson.outro : lesson.intro

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
    <div className="text-[11px] text-amber-200/50 uppercase tracking-widest">
      Make your move when ready
    </div>
  )

  return (
    <div className="flex flex-1 items-start justify-center gap-4 px-4 py-4 flex-wrap">
      {/* Narrative (left column) */}
      <div className="w-80 max-w-full flex-shrink-0">
        <NarrativePane teacher={teacher} lines={narrativeLines} footer={footer} />
      </div>

      {/* Board + reserves */}
      {!lesson.readOnly && (
        <>
          {/* Stack-vs-capture modal */}
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

          {/* Black reserve */}
          <div className="flex flex-col gap-3 w-52">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
              <span className="text-xs text-amber-200/60">Black (you)</span>
            </div>
            <ReservePanel
              playerState={gameState.players.black}
              owner="black"
              isMyTurn={gameState.currentPlayer === 'black' && !complete}
              isMyPanel={gameState.currentPlayer === 'black'}
              selectedReservePiece={gameState.currentPlayer === 'black' ? selectedReservePiece : null}
              onReservePieceClick={gameState.currentPlayer === 'black' ? handleReservePieceClick : () => {}}
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

          {/* White reserve (dim — no interaction in single-player tutorial) */}
          <div className="flex flex-col gap-3 w-52 opacity-60">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-stone-400" />
              <span className="text-xs text-amber-200/60">White</span>
            </div>
            <ReservePanel
              playerState={gameState.players.white}
              owner="white"
              isMyTurn={false}
              isMyPanel={false}
              selectedReservePiece={null}
              onReservePieceClick={() => {}}
              label="Reserve"
              mode={gameState.mode}
            />
          </div>
        </>
      )}
    </div>
  )
}
