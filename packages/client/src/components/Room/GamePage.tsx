import React, { useEffect, useState, useCallback } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import { useGameStore } from '../../store/gameStore'
import { Board } from '../Board/Board'
import { ReservePanel } from '../Reserve/ReservePanel'
import { GameOverOverlay } from '../GameOver/GameOverOverlay'
import { ChatPanel } from '../Chat/ChatPanel'
import { GameControls } from '../Controls/GameControls'
import { WaitingRoom } from './WaitingRoom'
import { MoveChoiceModal } from '../Board/MoveChoiceModal'
import { emitJoinRoom, emitMove, emitDebugSetState } from '../../socket/client'
import { ensureGuestSession } from '../../api/session'
import type { Move, Position, Player } from '@gungi/engine'

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
    mySkipVote,
    opponentSkipVote,
    selectCell,
    selectReservePiece,
    clearSelection,
  } = useGameStore()

  const [chatCollapsed, setChatCollapsed] = useState(false)
  const [gameOver, setGameOver] = useState<{
    winner: Player | null
    reason: 'checkmate' | 'resigned' | 'draw' | 'forfeit'
  } | null>(null)
  const [pendingChoice, setPendingChoice] = useState<{
    moves: Move[]
    from: Position | null
    to: Position
  } | null>(null)

  const displayName =
    (location.state as { displayName?: string } | null)?.displayName ?? 'Guest'

  // Join room on mount. If the visitor has no session yet (e.g. they followed
  // a share link in a fresh browser), create a guest session first instead of
  // bouncing them back to the home page.
  useEffect(() => {
    if (!code) {
      navigate('/')
      return
    }

    let cancelled = false
    ;(async () => {
      try {
        const token = await ensureGuestSession()
        if (cancelled) return
        emitJoinRoom(code.toUpperCase(), token, displayName)
      } catch (err) {
        console.error('Session/join failed:', err)
        if (!cancelled) navigate('/')
      }
    })()

    return () => { cancelled = true }
  }, [code, displayName, navigate])

  // Clear selection on clicks outside any game surface (board, reserve panels,
  // move-choice modal). Uses mousedown so it fires before a stray click can
  // trigger something else.
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null
      if (!target || target.closest('[data-game-surface]')) return
      clearSelection()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [clearSelection])

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
        const destMoves = legalMoves.filter(
          (m) => m.to.row === pos.row && m.to.col === pos.col
        )
        if (destMoves.length > 0) {
          const destTower = gameState.board[pos.row]?.[pos.col] ?? null
          const destHeight = destTower ? destTower.length : 0
          const srcTower = gameState.board[selectedPosition.row]?.[selectedPosition.col] ?? null
          const srcTop = srcTower ? srcTower[srcTower.length - 1] : null
          const isMajorOrGeneral =
            srcTop && (srcTop.type === 'major' || srcTop.type === 'general')
          const isCaptureOnly =
            destMoves.length === 1 && destMoves[0]!.type === 'capture'
          // Confirm modal when: multi-option, tier-3 tower capture, or Major/General capture
          const needsConfirm =
            destMoves.length > 1 ||
            destHeight === 3 ||
            (isMajorOrGeneral && isCaptureOnly)
          if (needsConfirm) {
            setPendingChoice({ moves: destMoves, from: selectedPosition, to: pos })
            return
          }
          useGameStore.getState().setLastMove({ from: selectedPosition, to: pos })
          emitMove(destMoves[0]!)
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

  // Waiting for opponent (or still negotiating the join)
  if (!gameState || waitingForOpponent) {
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
  const blackState = gameState.players.black
  const whiteState = gameState.players.white

  return (
    <div
      className="h-screen flex flex-col overflow-hidden"
      style={{ background: 'linear-gradient(160deg, #120900 0%, #0A0500 100%)' }}
    >
      {/* Stack-vs-capture choice modal */}
      {pendingChoice && (
        <MoveChoiceModal
          moves={pendingChoice.moves}
          onChoice={(move) => {
            useGameStore.getState().setLastMove({ from: pendingChoice.from, to: pendingChoice.to })
            emitMove(move)
            clearSelection()
            setPendingChoice(null)
          }}
          onCancel={() => { setPendingChoice(null); clearSelection() }}
        />
      )}

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

        {/* Left panel: Black's reserve (always) */}
        <div className="flex flex-col gap-3 w-52">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
            <span className="text-xs text-amber-200/60 truncate">
              {playerColor === 'black' ? 'You' : (opponentName ?? 'Opponent')} · Black
            </span>
            {gameState.currentPlayer === 'black' && !isMyTurn && (
              <span className="text-[10px] bg-amber-600/20 text-amber-400 px-1.5 py-0.5 rounded-full ml-auto">
                thinking
              </span>
            )}
          </div>

          <ReservePanel
            playerState={blackState}
            owner="black"
            isMyTurn={playerColor === 'black' && isMyTurn}
            isMyPanel={gameState.currentPlayer === 'black'}
            selectedReservePiece={playerColor === 'black' ? selectedReservePiece : null}
            onReservePieceClick={playerColor === 'black' ? handleReservePieceClick : () => {}}
            label="Reserve"
            mode={gameState.mode}
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

        {/* Right panel: White's reserve + controls + chat. Stretches to row
            height so ChatPanel's flex-1 can fill the leftover space. */}
        <div className="flex flex-col gap-3 w-52 self-stretch min-h-0">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-stone-400" />
            <span className="text-xs text-amber-200/60 truncate">
              {playerColor === 'white' ? 'You' : (opponentName ?? 'Opponent')} · White
            </span>
            {gameState.currentPlayer === 'white' && !isMyTurn && (
              <span className="text-[10px] bg-amber-600/20 text-amber-400 px-1.5 py-0.5 rounded-full ml-auto">
                thinking
              </span>
            )}
          </div>

          <ReservePanel
            playerState={whiteState}
            owner="white"
            isMyTurn={playerColor === 'white' && isMyTurn}
            isMyPanel={gameState.currentPlayer === 'white'}
            selectedReservePiece={playerColor === 'white' ? selectedReservePiece : null}
            onReservePieceClick={playerColor === 'white' ? handleReservePieceClick : () => {}}
            label="Reserve"
            mode={gameState.mode}
          />

          <GameControls
            drawOffered={drawOffered}
            drawPending={drawPending}
            gameActive={gameState.gameStatus === 'active'}
            canSkipPlacement={gameState.phase === 'placement'}
            mySkipVote={mySkipVote}
            opponentSkipVote={opponentSkipVote}
          />

          <ChatPanel
            messages={messages}
            playerColor={playerColor}
            collapsed={chatCollapsed}
            onToggle={() => setChatCollapsed((v) => !v)}
          />
        </div>
      </div>

      {/* Debug widget — dev only. Server applies the preset and broadcasts to
          both players, so this works for testing endgame scenarios with a
          friend in real time. */}
      {import.meta.env.DEV && (
        <div className="fixed bottom-3 left-3 flex flex-col gap-1 z-50">
          <span className="text-[9px] text-amber-200/30 uppercase tracking-widest">debug</span>
          <button
            onClick={() => emitDebugSetState('hybrid')}
            className="px-2 py-1 rounded bg-stone-800/80 border border-stone-600/40 text-amber-200/60 text-xs hover:text-amber-200 hover:border-amber-600/40 transition-colors"
          >
            → Skip to Hybrid
          </button>
          <button
            onClick={() => emitDebugSetState('near-checkmate')}
            className="px-2 py-1 rounded bg-stone-800/80 border border-stone-600/40 text-amber-200/60 text-xs hover:text-amber-200 hover:border-amber-600/40 transition-colors"
          >
            ⚔ Near Checkmate
          </button>
          <button
            onClick={() => emitDebugSetState('reset')}
            className="px-2 py-1 rounded bg-stone-800/80 border border-stone-600/40 text-amber-200/60 text-xs hover:text-amber-200 hover:border-amber-600/40 transition-colors"
          >
            ↺ Reset
          </button>
        </div>
      )}
    </div>
  )
}
