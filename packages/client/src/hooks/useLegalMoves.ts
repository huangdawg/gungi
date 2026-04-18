import { useMemo } from 'react'
import type { GameState, Move, Position, PieceType } from '@gungi/engine'
import { getLegalMoves } from '@gungi/engine'

/**
 * Returns the set of legal moves for a selected piece or reserve drop.
 * Computes client-side from the current game state without a server round-trip.
 */
export function useLegalMoves(
  gameState: GameState | null,
  selectedPosition: Position | null,
  selectedReservePiece: PieceType | null
): Move[] {
  return useMemo(() => {
    if (!gameState) return []

    const allLegal = getLegalMoves(gameState)

    if (selectedReservePiece !== null) {
      return allLegal.filter(
        (m) => m.type === 'place' && m.piece === selectedReservePiece
      )
    }

    if (selectedPosition !== null) {
      return allLegal.filter(
        (m) =>
          m.from &&
          m.from.row === selectedPosition.row &&
          m.from.col === selectedPosition.col
      )
    }

    return []
  }, [gameState, selectedPosition, selectedReservePiece])
}
