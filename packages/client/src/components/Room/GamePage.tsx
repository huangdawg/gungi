import React, { useEffect, useState, useCallback } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import { useGameStore } from '../../store/gameStore'
import { Board } from '../Board/Board'
import { ReservePanel } from '../Reserve/ReservePanel'
import { GameOverOverlay } from '../GameOver/GameOverOverlay'
import { ChatPanel } from '../Chat/ChatPanel'
import { GameControls } from '../Controls/GameControls'
import { WaitingRoom } from './WaitingRoom'
import { emitJoinRoom, emitMove } from '../../socket/client'
import type { Position, Player } from '@gungi/engine'

// ─── Game page ────────────────────────────────────────────────────────────────

export const GamePage: React.FC = () => {
  const { code } = useParams<{ code: string }>()
  const location = useLocation()
  const navigate = useNavigate()

  const {
    roomCode,
    playerColor,
    gameState,
    selectedPosition,
    selectedReservePiece,
    legalMoves,
    lastMove,
    messages,
    drawOffered,
    drawPending,
    waitingForOpponent,
    opponentName,
    selectCell,
    selectReservePiece,
    clearSelection,
  } = useGameStore()

  const [chatCollapsed, setChatCollapsed] = useState(false)
  const [gameOver, setGameOver] = useState<{
    winner: Player | null
    reason: 'checkmate' | 'resigned' | 'draw' | 'forfeit'
  } | null>(null)

  const displayName =
    (location.state as { displayName?: string } | null)?.displayName ?? 'Guest'

  // Join room on mount
  useEffect(() => {
    if (!code) {
      navigate('/')
      return
    }

    const token = localStorage.getItem('gungi-session-token') ?? ''
    if (!token) {
      navigate('/')
      return
    }

    emitJoinRoom(code.toUpperCase(), token, displayName)
  }, [code, displayName, navigate])

  // Watch for game over
  useEffect(() => {
    if (gameState && gameState.gameStatus !== 'active') {
      const reason = gameState.gameStatus as 'checkmate' | 'resigned' | 'draw'
      setGameOver({ winner: gameState.winner, reason })
    }
  }, [gameState?.gameStatus])

  const handleCellClick = useCallback(
    (pos: Position) => {
      if (!gameState || !playerColor) return
      if (gameState.currentPlayer !== playerColor) return

      // Drop mode
      if (selectedReservePiece !== null) {
        const dropMove = legalMoves.find(
          (m) => m.type === 'place' && m.to.row === pos.row && m.to.col === pos.col
        )
        if (dropMove) {
          useGameStore.getState().setLastMove({ from: null, to: pos })
          emitMove(dropMove)
          clearSelection()
        } else {
          clearSelection()
        }
        return
      }

      // Board move: if a destination is selected
      if (selectedPosition !== null) {
        const destMove = legalMoves.find(
          (m) => m.to.row === pos.row && m.to.col === pos.col
        )
        if (destMove) {
          useGameStore.getState().setLastMove({ from: selectedPosition, to: pos })
          emitMove(destMove)
          clearSelection()
          return
        }

        // Re-select own piece
        const tower = gameState.board[pos.row]?.[pos.col]
        const topPiece = tower ? tower[tower.length - 1] : null
        if (topPiece && topPiece.owner === playerColor) {
          selectCell(pos)
          return
        }

        clearSelection()
        return
      }

      // Select own piece
      selectCell(pos)
    },
    [gameState, playerColor, selectedPosition, selectedReservePiece, legalMoves, selectCell, clearSelection]
  )

  const handleReservePieceClick = useCallback(
    (piece: Parameters<typeof selectReservePiece>[0]) => {
      if (!gameState || !playerColor) return
      if (gameState.currentPlayer !== playerColor) return
      selectReservePiece(piece)
    },
    [gameState, playerColor, selectReservePiece]
  )

  // Waiting for opponent
  if (!gameState || (waitingForOpponent && gameState.players.black === null)) {
    return <WaitingRoom roomCode={code?.toUpperCase() ?? ''} />
  }

  // If we're connected but the room is waiting for second player
  if (waitingForOpponent) {
    return <WaitingRoom roomCode={roomCode ?? code?.toUpperCase() ?? ''} />
  }

  if (!playerColor) {
    return (
      <div className="min-h-screen flex items-center justify-center"
        style={{ background: 'linear-gradient(160deg, #1A0E00 0%, #0D0700 100%)' }}>
        <p className="text-amber-400">Connecting...</p>
      </div>
    )
  }

  const isMyTurn = gameState.currentPlayer === playerColor
  const opponentColor: Player = playerColor === 'black' ? 'white' : 'black'
  const myPlayerState = gameState.players[playerColor]
  const opponentPlayerState = gameState.players[opponentColor]

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: 'linear-gradient(160deg, #120900 0%, #0A0500 100%)' }}
    >
      {/* Game over overlay */}
      {gameOver && (
        <GameOverOverlay
          winner={gameOver.winner}
          reason={gameOver.reason}
          playerColor={playerColor}
        />
      )}

      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-amber-700/20">
        <div className="flex items-center gap-3">
          <span
            className="text-xl font-bold text-amber-400"
            style={{ fontFamily: "'Noto Serif SC', serif" }}
          >
            軍儀
          </span>
          <span className="text-xs text-amber-200/40 font-mono">{roomCode}</span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`text-xs font-semibold px-2 py-0.5 rounded-full
              ${isMyTurn
                ? 'bg-amber-600/30 text-amber-300'
                : 'bg-stone-700/30 text-stone-400'
              }`}
          >
            {isMyTurn ? 'Your turn' : "Opponent's turn"}
          </span>
          <span className="text-xs text-amber-200/30">
            Turn {gameState.turnNumber} · {gameState.phase === 'placement' ? 'Placement' : 'Hybrid'}
          </span>
        </div>
      </div>

      {/* Main layout */}
      <div className="flex flex-1 items-start justify-center gap-4 px-4 py-4 flex-wrap">

        {/* Left panel: opponent reserve */}
        <div className="flex flex-col gap-3 w-44">
          <div className="flex items-center gap-2">
            <div
              className={`w-2.5 h-2.5 rounded-full ${opponentColor === 'black' ? 'bg-red-500' : 'bg-stone-400'}`}
            />
            <span className="text-xs text-amber-200/60 truncate">
              {opponentName ?? opponentColor.charAt(0).toUpperCase() + opponentColor.slice(1)}
            </span>
            {!isMyTurn && (
              <span className="text-[10px] bg-amber-600/20 text-amber-400 px-1.5 py-0.5 rounded-full ml-auto">
                thinking
              </span>
            )}
          </div>

          <ReservePanel
            playerState={opponentPlayerState}
            owner={opponentColor}
            isMyTurn={false}
            isMyPanel={false}
            selectedReservePiece={null}
            onReservePieceClick={() => {}}
            label="Opponent Reserve"
          />
        </div>

        {/* Center: board */}
        <div className="flex flex-col items-center gap-3">
          <Board
            gameState={gameState}
            playerColor={playerColor}
            selectedPosition={selectedPosition}
            legalMoves={legalMoves}
            lastMove={lastMove}
            onCellClick={handleCellClick}
          />
        </div>

        {/* Right panel: my reserve + controls + chat */}
        <div className="flex flex-col gap-3 w-44">
          <div className="flex items-center gap-2">
            <div
              className={`w-2.5 h-2.5 rounded-full ${playerColor === 'black' ? 'bg-red-500' : 'bg-stone-400'}`}
            />
            <span className="text-xs text-amber-200/60 truncate">
              You ({playerColor})
            </span>
            {isMyTurn && (
              <span className="text-[10px] bg-green-700/20 text-green-400 px-1.5 py-0.5 rounded-full ml-auto">
                your turn
              </span>
            )}
          </div>

          <ReservePanel
            playerState={myPlayerState}
            owner={playerColor}
            isMyTurn={isMyTurn}
            isMyPanel={true}
            selectedReservePiece={selectedReservePiece}
            onReservePieceClick={handleReservePieceClick}
            label="Your Reserve"
          />

          <GameControls
            drawOffered={drawOffered}
            drawPending={drawPending}
            gameActive={gameState.gameStatus === 'active'}
          />

          <ChatPanel
            messages={messages}
            playerColor={playerColor}
            collapsed={chatCollapsed}
            onToggle={() => setChatCollapsed((v) => !v)}
          />
        </div>
      </div>
    </div>
  )
}
