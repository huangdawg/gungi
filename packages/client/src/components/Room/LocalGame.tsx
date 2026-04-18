import React, { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  createInitialState,
  applyMove,
  getLegalMoves,
  resign,
  declareDraw,
} from '@gungi/engine'
import type { GameState, Move, Position, PieceType, Player } from '@gungi/engine'
import { Board } from '../Board/Board'
import { ReservePanel } from '../Reserve/ReservePanel'
import { GameOverOverlay } from '../GameOver/GameOverOverlay'

// ─── Local game — no server, both players on same device ─────────────────────

export const LocalGame: React.FC = () => {
  const navigate = useNavigate()

  const [gameState, setGameState] = useState<GameState>(() => createInitialState())
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null)
  const [selectedReservePiece, setSelectedReservePiece] = useState<PieceType | null>(null)
  const [legalMoves, setLegalMoves] = useState<Move[]>([])
  const [lastMove, setLastMove] = useState<{ from: Position | null; to: Position } | null>(null)
  const [drawOffered, setDrawOffered] = useState(false)
  const [drawPending, setDrawPending] = useState(false)

  const currentPlayer = gameState.currentPlayer
  const isActive = gameState.gameStatus === 'active'

  // ── Selection helpers ──

  const clearSelection = useCallback(() => {
    setSelectedPosition(null)
    setSelectedReservePiece(null)
    setLegalMoves([])
  }, [])

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
        const dest = legalMoves.find(
          m => m.to.row === pos.row && m.to.col === pos.col
        )
        if (dest) {
          executeMove(dest, selectedPosition, pos)
          return
        }
        // Re-select own piece
        selectPieceAt(pos, gameState)
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

  const opponentColor: Player = currentPlayer === 'black' ? 'white' : 'black'
  const myPlayerState = gameState.players[currentPlayer]
  const opponentPlayerState = gameState.players[opponentColor]
  const isOver = gameState.gameStatus !== 'active'

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: 'linear-gradient(160deg, #120900 0%, #0A0500 100%)' }}
    >
      {/* Game over overlay */}
      {isOver && (
        <GameOverOverlay
          winner={gameState.winner}
          reason={gameState.gameStatus as 'checkmate' | 'resigned' | 'draw'}
          playerColor={currentPlayer}
          onPlayAgain={() => { setGameState(createInitialState()); clearSelection(); setLastMove(null); setDrawOffered(false); setDrawPending(false); }}
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
            Turn {gameState.turnNumber} · {gameState.phase === 'placement' ? 'Placement' : 'Hybrid'}
          </span>
        </div>
      </div>

      {/* Main layout */}
      <div className="flex flex-1 items-start justify-center gap-4 px-4 py-4 flex-wrap">

        {/* Left: opponent (the player who just moved) reserve */}
        <div className="flex flex-col gap-3 w-44">
          <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${opponentColor === 'black' ? 'bg-red-500' : 'bg-stone-400'}`} />
            <span className="text-xs text-amber-200/60">
              {opponentColor === 'black' ? 'Black' : 'White'} (waiting)
            </span>
          </div>
          <ReservePanel
            playerState={opponentPlayerState}
            owner={opponentColor}
            isMyTurn={false}
            isMyPanel={false}
            selectedReservePiece={null}
            onReservePieceClick={() => {}}
            label="Reserve"
          />
        </div>

        {/* Center: board */}
        <div className="flex flex-col items-center gap-3">
          <Board
            gameState={gameState}
            playerColor={currentPlayer}
            selectedPosition={selectedPosition}
            legalMoves={legalMoves}
            lastMove={lastMove}
            onCellClick={handleCellClick}
          />
        </div>

        {/* Right: current player reserve + controls */}
        <div className="flex flex-col gap-3 w-44">
          <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${currentPlayer === 'black' ? 'bg-red-500' : 'bg-stone-400'}`} />
            <span className="text-xs text-amber-200/60">
              {currentPlayer === 'black' ? 'Black' : 'White'} (active)
            </span>
            <span className="text-[10px] bg-green-700/20 text-green-400 px-1.5 py-0.5 rounded-full ml-auto">
              your turn
            </span>
          </div>

          <ReservePanel
            playerState={myPlayerState}
            owner={currentPlayer}
            isMyTurn={isActive}
            isMyPanel={true}
            selectedReservePiece={selectedReservePiece}
            onReservePieceClick={handleReservePieceClick}
            label="Reserve"
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
    </div>
  )
}
