import React, { useState, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  createInitialState,
  applyMove,
  getLegalMoves,
  resign,
  declareDraw,
  buildPreset,
} from '@gungi/engine'
import type { GameState, Move, Position, PieceType, Player } from '@gungi/engine'
import { Board } from '../Board/Board'
import { ReservePanel } from '../Reserve/ReservePanel'
import { GameOverOverlay } from '../GameOver/GameOverOverlay'
import { MoveChoiceModal } from '../Board/MoveChoiceModal'

// ─── Debug helper ─────────────────────────────────────────────────────────────

/** Minimal board positioned 1 move away from checkmate.
 *  Black to move. Black musketeer at e4 can slide forward and capture white marshal at e9. */
function buildNearCheckmateState(): GameState {
  const board: GameState['board'] = Array.from({ length: 9 }, () =>
    Array.from({ length: 9 }, () => null)
  )

  const place = (row: number, col: number, type: PieceType, owner: Player) => {
    board[row]![col] = [{ type, owner }]
  }

  // Marshals
  place(0, 4, 'marshal', 'black')
  place(8, 4, 'marshal', 'white')

  // Black musketeer positioned to slide straight forward into white marshal (no blockers in file e)
  place(3, 4, 'musketeer', 'black')

  // A few quiet pieces so the board feels lived-in (no effect on the win path)
  place(2, 1, 'pawn', 'black')
  place(6, 7, 'pawn', 'white')
  place(1, 6, 'knight', 'black')
  place(7, 2, 'knight', 'white')

  const emptyReserve: PieceType[] = []

  return {
    mode: 'normal',
    board,
    players: {
      black: { reserve: emptyReserve, placedCount: 25, onBoardCount: 4 },
      white: { reserve: emptyReserve, placedCount: 25, onBoardCount: 3 },
    },
    currentPlayer: 'black',
    phase: 'game',
    turnNumber: 51,
    gameStatus: 'active',
    winner: null,
  }
}

// ─── Local game — no server, both players on same device ─────────────────────

export const LocalGame: React.FC = () => {
  const navigate = useNavigate()

  // Read mode from ?mode=mini in the URL; default to normal if absent or invalid.
  const mode: 'normal' | 'mini' = (() => {
    const raw = new URLSearchParams(window.location.search).get('mode')
    return raw === 'mini' ? 'mini' : 'normal'
  })()

  const [gameState, setGameState] = useState<GameState>(() => createInitialState(mode))
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null)
  const [selectedReservePiece, setSelectedReservePiece] = useState<PieceType | null>(null)
  const [legalMoves, setLegalMoves] = useState<Move[]>([])
  const [lastMove, setLastMove] = useState<{ from: Position | null; to: Position } | null>(null)
  const [drawOffered, setDrawOffered] = useState(false)
  const [drawPending, setDrawPending] = useState(false)
  const [pendingChoice, setPendingChoice] = useState<{
    moves: Move[]
    from: Position | null
    to: Position
  } | null>(null)

  const currentPlayer = gameState.currentPlayer
  const isActive = gameState.gameStatus === 'active'

  // ── Selection helpers ──

  const clearSelection = useCallback(() => {
    setSelectedPosition(null)
    setSelectedReservePiece(null)
    setLegalMoves([])
  }, [])

  // Clear selection when the user clicks outside any game surface.
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null
      if (!target || target.closest('[data-game-surface]')) return
      clearSelection()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [clearSelection])

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
      const allLegal = getLegalMoves(state)
      setLegalMoves(allLegal.filter(m => m.from && m.from.row === pos.row && m.from.col === pos.col))
    },
    [clearSelection]
  )

  // ── Apply a move and update state ──

  const executeMove = useCallback(
    (move: Move, fromPos: Position | null, toPos: Position) => {
      const result = applyMove(gameState, move)
      if (!result.ok) return
      setGameState(result.state)
      setLastMove({ from: fromPos, to: toPos })
      clearSelection()
      // Reset draw state on any move
      setDrawOffered(false)
      setDrawPending(false)
    },
    [gameState, clearSelection]
  )

  // ── Cell click handler ──

  const handleCellClick = useCallback(
    (pos: Position) => {
      if (!isActive) return

      // Drop mode
      if (selectedReservePiece !== null) {
        const drop = legalMoves.find(
          m => m.type === 'place' && m.to.row === pos.row && m.to.col === pos.col
        )
        if (drop) {
          executeMove(drop, null, pos)
        } else {
          clearSelection()
        }
        return
      }

      // Move mode: destination click
      if (selectedPosition !== null) {
        const destMoves = legalMoves.filter(
          m => m.to.row === pos.row && m.to.col === pos.col
        )
        if (destMoves.length === 0) {
          // Re-select own piece
          selectPieceAt(pos, gameState)
          return
        }

        const destTower = gameState.board[pos.row]?.[pos.col] ?? null
        const destHeight = destTower ? destTower.length : 0
        // Identify moving piece for piece-specific confirmation rules
        const srcTower = gameState.board[selectedPosition.row]?.[selectedPosition.col] ?? null
        const srcTop = srcTower ? srcTower[srcTower.length - 1] : null
        const isMajorOrGeneral =
          srcTop && (srcTop.type === 'major' || srcTop.type === 'general')
        const isCaptureOnly =
          destMoves.length === 1 && destMoves[0]!.type === 'capture'
        // Confirm via modal when:
        //   - multiple options (stack vs capture), OR
        //   - capturing into a full (height-3) tower, OR
        //   - Major/General executing a capture (high-value piece commits intent)
        const needsConfirm =
          destMoves.length > 1 ||
          destHeight === 3 ||
          (isMajorOrGeneral && isCaptureOnly)
        if (needsConfirm) {
          setPendingChoice({ moves: destMoves, from: selectedPosition, to: pos })
          return
        }
        executeMove(destMoves[0]!, selectedPosition, pos)
        return
      }

      // Select piece
      selectPieceAt(pos, gameState)
    },
    [
      isActive, selectedReservePiece, selectedPosition,
      legalMoves, executeMove, clearSelection, selectPieceAt, gameState,
    ]
  )

  // ── Reserve piece click ──

  const handleReservePieceClick = useCallback(
    (piece: PieceType) => {
      if (!isActive) return
      if (selectedReservePiece === piece) {
        clearSelection()
        return
      }
      setSelectedReservePiece(piece)
      setSelectedPosition(null)
      const allLegal = getLegalMoves(gameState)
      setLegalMoves(allLegal.filter(m => m.type === 'place' && m.piece === piece))
    },
    [isActive, selectedReservePiece, gameState, clearSelection]
  )

  // ── Controls ──

  const handleResign = useCallback(() => {
    setGameState(prev => resign(prev, prev.currentPlayer))
    clearSelection()
  }, [clearSelection])

  const handleDrawOffer = useCallback(() => {
    setDrawPending(true)
    setDrawOffered(true) // opponent sees it immediately (same screen)
  }, [])

  const handleDrawAccept = useCallback(() => {
    setGameState(prev => declareDraw(prev))
    setDrawOffered(false)
    setDrawPending(false)
    clearSelection()
  }, [clearSelection])

  const handleDrawDecline = useCallback(() => {
    setDrawOffered(false)
    setDrawPending(false)
  }, [])

  // ── Derived ──

  const isOver = gameState.gameStatus !== 'active'
  const blackState = gameState.players.black
  const whiteState = gameState.players.white

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: 'linear-gradient(160deg, #120900 0%, #0A0500 100%)' }}
    >
      {/* Stack-vs-capture choice modal */}
      {pendingChoice && (
        <MoveChoiceModal
          moves={pendingChoice.moves}
          onChoice={(move) => {
            executeMove(move, pendingChoice.from, pendingChoice.to)
            setPendingChoice(null)
          }}
          onCancel={() => { setPendingChoice(null); clearSelection() }}
        />
      )}

      {/* Game over overlay — floats above board, board stays visible */}
      {isOver && (
        <GameOverOverlay
          variant="local"
          winner={gameState.winner}
          reason={gameState.gameStatus as 'checkmate' | 'resigned' | 'draw'}
          playerColor={currentPlayer}
          onPlayAgain={() => { setGameState(createInitialState(mode)); clearSelection(); setLastMove(null); setDrawOffered(false); setDrawPending(false); }}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-amber-700/20">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="text-amber-200/40 hover:text-amber-200/70 text-xs transition-colors"
          >
            ← Home
          </button>
          <span
            className="text-xl font-bold text-amber-400"
            style={{ fontFamily: "'Noto Serif SC', serif" }}
          >
            軍儀
          </span>
          <span className="text-xs text-amber-200/40">Local Game</span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`text-xs font-semibold px-2 py-0.5 rounded-full
              ${currentPlayer === 'black'
                ? 'bg-red-900/40 text-red-300'
                : 'bg-stone-600/40 text-stone-300'
              }`}
          >
            {currentPlayer === 'black' ? '● Black' : '○ White'}'s turn
          </span>
          <span className="text-xs text-amber-200/30">
            Turn {gameState.turnNumber} · {gameState.phase === 'setup' ? 'Setup' : 'Game'}
          </span>
        </div>
      </div>

      {/* Main layout */}
      <div className="flex flex-1 items-start justify-center gap-4 px-4 py-4 flex-wrap">

        {/* Left: Black's reserve (always) */}
        <div className="flex flex-col gap-3 w-52">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
            <span className="text-xs text-amber-200/60">Black</span>
            {currentPlayer === 'black' && isActive && (
              <span className="text-[10px] bg-red-900/30 text-red-300 px-1.5 py-0.5 rounded-full ml-auto">
                active
              </span>
            )}
          </div>
          <ReservePanel
            playerState={blackState}
            owner="black"
            isMyTurn={currentPlayer === 'black' && isActive}
            isMyPanel={currentPlayer === 'black'}
            selectedReservePiece={currentPlayer === 'black' ? selectedReservePiece : null}
            onReservePieceClick={currentPlayer === 'black' ? handleReservePieceClick : () => {}}
            label="Reserve"
            mode={gameState.mode}
          />
        </div>

        {/* Center: board — when game ends, freeze perspective to the winner's side
            so the capturing move stays in its original orientation. */}
        <div className="flex flex-col items-center gap-3">
          <Board
            gameState={gameState}
            playerColor={isActive ? currentPlayer : (gameState.winner ?? currentPlayer)}
            selectedPosition={selectedPosition}
            legalMoves={legalMoves}
            lastMove={lastMove}
            onCellClick={handleCellClick}
          />
        </div>

        {/* Right: White's reserve + controls (always) */}
        <div className="flex flex-col gap-3 w-52">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-stone-400" />
            <span className="text-xs text-amber-200/60">White</span>
            {currentPlayer === 'white' && isActive && (
              <span className="text-[10px] bg-stone-600/30 text-stone-300 px-1.5 py-0.5 rounded-full ml-auto">
                active
              </span>
            )}
          </div>

          <ReservePanel
            playerState={whiteState}
            owner="white"
            isMyTurn={currentPlayer === 'white' && isActive}
            isMyPanel={currentPlayer === 'white'}
            selectedReservePiece={currentPlayer === 'white' ? selectedReservePiece : null}
            onReservePieceClick={currentPlayer === 'white' ? handleReservePieceClick : () => {}}
            label="Reserve"
            mode={gameState.mode}
          />

          {/* Local controls */}
          {isActive && (
            <div className="flex flex-col gap-2">
              {drawOffered && !drawPending && (
                <div className="flex flex-col gap-1 p-2 rounded-lg bg-amber-700/20 border border-amber-600/30 text-xs text-amber-200">
                  <span>Draw offered — accept?</span>
                  <div className="flex gap-1">
                    <button onClick={handleDrawAccept} className="flex-1 py-1 rounded bg-green-700/60 hover:bg-green-600/60 text-green-200 text-xs">Accept</button>
                    <button onClick={handleDrawDecline} className="flex-1 py-1 rounded bg-stone-700/60 hover:bg-stone-600/60 text-stone-300 text-xs">Decline</button>
                  </div>
                </div>
              )}
              {!drawOffered && (
                <button onClick={handleDrawOffer} className="w-full py-1.5 rounded-lg bg-stone-700/50 hover:bg-stone-600/50 text-amber-200/70 text-xs transition-colors">
                  Offer Draw
                </button>
              )}
              <button onClick={handleResign} className="w-full py-1.5 rounded-lg bg-red-900/30 hover:bg-red-800/40 text-red-300/70 text-xs transition-colors">
                Resign
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Debug widget — dev only */}
      {import.meta.env.DEV && (
        <div className="fixed bottom-3 left-3 flex flex-col gap-1 z-50">
          <span className="text-[9px] text-amber-200/30 uppercase tracking-widest">debug</span>
          <button
            onClick={() => { setGameState(buildPreset('hybrid', mode)); clearSelection(); setLastMove(null) }}
            className="px-2 py-1 rounded bg-stone-800/80 border border-stone-600/40 text-amber-200/60 text-xs hover:text-amber-200 hover:border-amber-600/40 transition-colors"
          >
            → Skip Setup
          </button>
          {mode === 'normal' && (
            <button
              onClick={() => { setGameState(buildNearCheckmateState()); clearSelection(); setLastMove(null); setDrawOffered(false); setDrawPending(false) }}
              className="px-2 py-1 rounded bg-stone-800/80 border border-stone-600/40 text-amber-200/60 text-xs hover:text-amber-200 hover:border-amber-600/40 transition-colors"
            >
              ⚔ Near Checkmate
            </button>
          )}
          <button
            onClick={() => { setGameState(createInitialState(mode)); clearSelection(); setLastMove(null); setDrawOffered(false); setDrawPending(false) }}
            className="px-2 py-1 rounded bg-stone-800/80 border border-stone-600/40 text-amber-200/60 text-xs hover:text-amber-200 hover:border-amber-600/40 transition-colors"
          >
            ↺ Reset
          </button>
        </div>
      )}
    </div>
  )
}
