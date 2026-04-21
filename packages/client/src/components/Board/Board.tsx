import React, { useState, useEffect } from 'react'
import type { GameState, Position, Move, Player } from '@gungi/engine'
import { Cell } from './Cell'
import type { CellHighlight } from './Cell'

// ─── Props ────────────────────────────────────────────────────────────────────

interface BoardProps {
  gameState: GameState
  playerColor: Player
  selectedPosition: Position | null
  legalMoves: Move[]
  lastMove: { from: Position | null; to: Position } | null
  onCellClick: (pos: Position) => void
  /** Optional cap on cell size (default 80). Tutorial uses this to leave
   *  room for the narrative pane without overflowing the page. */
  maxCellSize?: number
}

// ─── Component ────────────────────────────────────────────────────────────────

export const Board: React.FC<BoardProps> = ({
  gameState,
  playerColor,
  selectedPosition,
  legalMoves,
  lastMove,
  onCellClick,
  maxCellSize = 80,
}) => {
  const { board } = gameState
  const boardSize = board.length

  const [cellSize, setCellSize] = useState(() => {
    const available = window.innerHeight - 148
    return Math.max(50, Math.min(maxCellSize, Math.floor(available / boardSize)))
  })

  useEffect(() => {
    const update = () => {
      const available = window.innerHeight - 148
      setCellSize(Math.max(50, Math.min(maxCellSize, Math.floor(available / boardSize))))
    }
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [boardSize, maxCellSize])

  const flipped = playerColor === 'black'
  const range = Array.from({ length: boardSize }, (_, i) => i)
  const displayRows = flipped ? [...range].reverse() : range
  const displayCols = flipped ? [...range].reverse() : range
  // File labels a..<boardSize> (a..e for mini, a..i for normal)
  const colLabels = range.map((i) => String.fromCharCode(97 + i))
  const displayColLabels = flipped ? [...colLabels].reverse() : colLabels
  const rowLabel = (row: number) => String(boardSize - row)

  function getCellHighlight(row: number, col: number): CellHighlight {
    const tower = board[row]?.[col]
    const topPiece = tower ? tower[tower.length - 1] : null

    // Selected
    if (selectedPosition?.row === row && selectedPosition?.col === col) {
      return 'selected'
    }

    // Legal move destination(s)
    const matchingMoves = legalMoves.filter(
      (m) => m.to.row === row && m.to.col === col
    )
    if (matchingMoves.length > 0) {
      if (!topPiece) return 'legal-empty'
      if (matchingMoves.length > 1) return 'legal-dual'
      // Single-option: derive from actual move type.
      // Placement onto an occupied cell = stacking onto a friendly tower.
      const m = matchingMoves[0]!
      if (m.type === 'capture') return 'legal-capture'
      if (m.type === 'stack') return 'legal-stack'
      if (m.type === 'place') return 'legal-stack' // placement on occupied = stacking
      return 'legal-empty'
    }

    // Last move from
    if (lastMove?.from?.row === row && lastMove?.from?.col === col) {
      return 'last-move-from'
    }
    // Last move to
    if (lastMove?.to.row === row && lastMove?.to.col === col) {
      return 'last-move-to'
    }

    return 'none'
  }

  return (
    <div className="flex flex-col items-center" data-game-surface>
      {/* Board container with wood texture */}
      <div
        className="relative p-3 rounded-lg shadow-2xl"
        style={{
          background: `
            repeating-linear-gradient(
              90deg,
              transparent,
              transparent 12px,
              rgba(0,0,0,0.04) 12px,
              rgba(0,0,0,0.04) 13px
            ),
            repeating-linear-gradient(
              0deg,
              transparent,
              transparent 12px,
              rgba(0,0,0,0.04) 12px,
              rgba(0,0,0,0.04) 13px
            ),
            linear-gradient(160deg, #4A2C0A 0%, #6B3D15 40%, #3D2008 100%)
          `,
          boxShadow: '0 8px 32px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.1)',
        }}
      >
        {/* Column labels top */}
        <div className="flex pl-6 pr-1 mb-0.5">
          {displayColLabels.map((label) => (
            <div key={label} className="flex-1 text-center text-xs font-medium text-amber-300/70">
              {label}
            </div>
          ))}
        </div>

        {/* Grid + row labels */}
        <div className="flex">
          {/* Row labels left */}
          <div className="flex flex-col justify-around pr-1 w-5">
            {displayRows.map((row) => (
              <div key={row} className="flex-1 flex items-center justify-center text-xs font-medium text-amber-300/70">
                {rowLabel(row)}
              </div>
            ))}
          </div>

          {/* Grid — columns/rows scale with boardSize (9 for normal, 5 for mini) */}
          <div
            className="grid gap-px"
            style={{
              gridTemplateColumns: `repeat(${boardSize}, 1fr)`,
              gridTemplateRows: `repeat(${boardSize}, 1fr)`,
            }}
          >
            {displayRows.map((row) =>
              displayCols.map((col) => {
                const pos: Position = { row, col }
                const tower = board[row]?.[col] ?? null
                const highlight = getCellHighlight(row, col)
                const isDark = (row + col) % 2 === 1

                return (
                  <div key={`${row}-${col}`} style={{ width: cellSize, height: cellSize }}>
                    <Cell
                      pos={pos}
                      tower={tower}
                      highlight={highlight}
                      onClick={onCellClick}
                      isDark={isDark}
                      pieceSize={Math.round(cellSize * 0.85)}
                    />
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Column labels bottom */}
        <div className="flex pl-6 pr-1 mt-0.5">
          {displayColLabels.map((label) => (
            <div key={label} className="flex-1 text-center text-xs font-medium text-amber-300/70">
              {label}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
