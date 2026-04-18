import React from 'react'
import type { Position, Move, Tower } from '@gungi/engine'
import { PieceToken } from './PieceToken'

// ─── Highlight types ──────────────────────────────────────────────────────────

export type CellHighlight =
  | 'none'
  | 'selected'        // currently selected piece
  | 'legal-empty'     // legal move to empty square
  | 'legal-capture'   // legal move to enemy piece
  | 'legal-stack'     // legal move to stack on own piece
  | 'last-move-from'  // last move origin
  | 'last-move-to'    // last move destination

export interface CellProps {
  pos: Position
  tower: Tower | null
  highlight: CellHighlight
  /** Whether we should show the legal move dot/ring (no piece → dot, enemy → ring) */
  legalMove?: Move | null
  onClick: (pos: Position) => void
  /** Alternating cell tone for visual wood texture */
  isDark: boolean
}

export const Cell: React.FC<CellProps> = ({
  pos,
  tower,
  highlight,
  onClick,
  isDark,
}) => {
  const topPiece = tower ? tower[tower.length - 1] : null
  const towerHeight = tower ? tower.length : 0

  const handleClick = () => onClick(pos)

  // ── Cell background color ──
  let bgClass = isDark ? 'bg-amber-900/20' : 'bg-amber-800/10'

  if (highlight === 'last-move-from' || highlight === 'last-move-to') {
    bgClass = 'bg-amber-400/30'
  }
  if (highlight === 'selected') {
    bgClass = 'bg-amber-400/40'
  }

  return (
    <div
      className={`relative flex items-center justify-center cursor-pointer select-none
        ${bgClass}
        border border-amber-800/40
        hover:bg-amber-400/20 transition-colors duration-100
        aspect-square`}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleClick()}
      aria-label={`Cell ${String.fromCharCode(97 + pos.col)}${9 - pos.row}`}
    >
      {/* Tower height indicator (subtle number for multi-piece towers) */}
      {towerHeight > 1 && (
        <span className="absolute top-0.5 right-1 text-[9px] font-bold text-amber-200/70 z-10 leading-none">
          {towerHeight}
        </span>
      )}

      {/* Piece token */}
      {topPiece && (
        <div className={`
          z-10 flex items-center justify-center
          ${highlight === 'selected' ? 'drop-shadow-[0_0_6px_rgba(212,160,23,0.9)]' : ''}
          ${highlight === 'legal-capture' ? 'animate-pulse' : ''}
        `}>
          <PieceToken
            type={topPiece.type}
            owner={topPiece.owner}
            height={towerHeight}
            size={68}
            selected={highlight === 'selected'}
          />
        </div>
      )}

      {/* Legal move indicator — empty square */}
      {!topPiece && (highlight === 'legal-empty' || highlight === 'legal-stack') && (
        <div className="w-3 h-3 rounded-full bg-amber-400/70 shadow-sm" />
      )}

      {/* Legal capture ring — enemy piece */}
      {topPiece && highlight === 'legal-capture' && (
        <div className="absolute inset-1 rounded-full border-2 border-red-500/80 animate-pulse pointer-events-none" />
      )}

      {/* Legal stack indicator — own piece */}
      {topPiece && highlight === 'legal-stack' && (
        <div className="absolute inset-1 rounded-full border-2 border-amber-400/80 pointer-events-none" />
      )}
    </div>
  )
}
