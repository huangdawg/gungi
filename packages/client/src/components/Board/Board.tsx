import React from 'react'
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
}

// ─── Component ────────────────────────────────────────────────────────────────

export const Board: React.FC<BoardProps> = ({
  gameState,
  playerColor,
  selectedPosition,
  legalMoves,
  lastMove,
  onCellClick,
}) => {
  const { board } = gameState

  // Column labels: a–i (col 0 = a)
  const colLabels = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i']
  // Row labels: 1–9 where row 0 = row label 9 (Black's back rank at top)
  const rowLabel = (row: number) => String(9 - row)

  function getCellHighlight(row: number, col: number): CellHighlight {
    const tower = board[row]?.[col]
    const topPiece = tower ? tower[tower.length - 1] : null

    // Selected
    if (selectedPosition?.row === row && selectedPosition?.col === col) {
      return 'selected'
    }

    // Legal move destination
    const matchingMove = legalMoves.find(
      (m) => m.to.row === row && m.to.col === col
    )
    if (matchingMove) {
      if (!topPiece) return 'legal-empty'
      if (topPiece.owner !== playerColor) return 'legal-capture'
      return 'legal-stack'
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
    <div className="flex flex-col items-center">
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
          {colLabels.map((label) => (
            <div
              key={label}
              className="flex-1 text-center text-xs font-medium text-amber-300/70"
            >
              {label}
            </div>
          ))}
        </div>

        {/* Grid + row labels */}
        <div className="flex">
          {/* Row labels left */}
          <div className="flex flex-col justify-around pr-1 w-5">
            {Array.from({ length: 9 }, (_, i) => (
              <div
                key={i}
                className="flex-1 flex items-center justify-center text-xs font-medium text-amber-300/70"
              >
                {rowLabel(i)}
              </div>
            ))}
          </div>

          {/* 9x9 Grid */}
          <div
            className="grid gap-px"
            style={{
              gridTemplateColumns: 'repeat(9, 1fr)',
              gridTemplateRows: 'repeat(9, 1fr)',
            }}
          >
            {Array.from({ length: 9 }, (_, row) =>
              Array.from({ length: 9 }, (_, col) => {
                const pos: Position = { row, col }
                const tower = board[row]?.[col] ?? null
                const highlight = getCellHighlight(row, col)
                const isDark = (row + col) % 2 === 1

                return (
                  <div key={`${row}-${col}`} style={{ width: 80, height: 80 }}>
                    <Cell
                      pos={pos}
                      tower={tower}
                      highlight={highlight}
                      onClick={onCellClick}
                      isDark={isDark}
                    />
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Column labels bottom */}
        <div className="flex pl-6 pr-1 mt-0.5">
          {colLabels.map((label) => (
            <div
              key={label}
              className="flex-1 text-center text-xs font-medium text-amber-300/70"
            >
              {label}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
