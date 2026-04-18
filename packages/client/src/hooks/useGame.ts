import { useCallback } from 'react'
import type { Position, PieceType, Move } from '@gungi/engine'
import { useGameStore } from '../store/gameStore'
import { emitMove } from '../socket/client'

/**
 * Game interaction hook — handles piece selection, move execution, and drops.
 */
export function useGame() {
  const store = useGameStore()

  const handleCellClick = useCallback(
    (pos: Position) => {
      const {
        gameState,
        playerColor,
        selectedPosition,
        selectedReservePiece,
        legalMoves,
        selectCell,
        clearSelection,
        setLastMove,
      } = useGameStore.getState()

      if (!gameState || !playerColor) return

      // Not our turn
      if (gameState.currentPlayer !== playerColor) {
        clearSelection()
        return
      }

      // ── Drop mode: placing a reserve piece ──
      if (selectedReservePiece !== null) {
        const dropMove = legalMoves.find(
          (m) => m.type === 'place' && m.to.row === pos.row && m.to.col === pos.col
        )
        if (dropMove) {
          setLastMove({ from: null, to: pos })
          emitMove(dropMove)
          clearSelection()
        } else {
          // Clicked a non-valid square in drop mode: cancel drop mode
          clearSelection()
        }
        return
      }

      // ── Board move: piece selected ──
      if (selectedPosition !== null) {
        const destMove = legalMoves.find(
          (m) => m.to.row === pos.row && m.to.col === pos.col
        )

        if (destMove) {
          setLastMove({ from: selectedPosition, to: pos })
          emitMove(destMove)
          clearSelection()
          return
        }

        // Clicking another own piece: re-select
        const tower = gameState.board[pos.row]?.[pos.col]
        const topPiece = tower ? tower[tower.length - 1] : null
        if (topPiece && topPiece.owner === playerColor) {
          selectCell(pos)
          return
        }

        // Clicking invalid: deselect
        clearSelection()
        return
      }

      // ── No selection: select a piece ──
      selectCell(pos)
    },
    []
  )

  const handleReserveClick = useCallback((piece: PieceType) => {
    const { gameState, playerColor, selectReservePiece } = useGameStore.getState()
    if (!gameState || !playerColor) return
    if (gameState.currentPlayer !== playerColor) return
    selectReservePiece(piece)
  }, [])

  const sendMove = useCallback((move: Move) => {
    const { setLastMove, clearSelection } = useGameStore.getState()
    const from = move.from ?? null
    setLastMove({ from, to: move.to })
    emitMove(move)
    clearSelection()
  }, [])

  return {
    handleCellClick,
    handleReserveClick,
    sendMove,
    selectedPosition: store.selectedPosition,
    selectedReservePiece: store.selectedReservePiece,
    legalMoves: store.legalMoves,
    gameState: store.gameState,
    playerColor: store.playerColor,
  }
}
