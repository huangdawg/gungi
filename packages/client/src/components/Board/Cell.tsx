import React, { useState } from 'react'
import type { Position, Move, Tower, PieceType } from '@gungi/engine'
import { PieceToken } from './PieceToken'

const KANJI: Record<PieceType, string> = {
  marshal: '帅', pawn: '小', general: '大', major: '中',
  musketeer: '筒', knight: '马', samurai: '士', cannon: '炮',
  spy: '忍', fortress: '岩', archer: '弓',
}
const ENGLISH: Record<PieceType, string> = {
  marshal: 'Marshal', pawn: 'Pawn', general: 'General', major: 'Major',
  musketeer: 'Musketeer', knight: 'Knight', samurai: 'Samurai', cannon: 'Cannon',
  spy: 'Spy', fortress: 'Fortress', archer: 'Archer',
}

// ─── Highlight types ──────────────────────────────────────────────────────────

export type CellHighlight =
  | 'none'
  | 'selected'        // currently selected piece
  | 'legal-empty'     // legal move to empty square
  | 'legal-capture'   // legal move to enemy piece (capture only)
  | 'legal-stack'     // legal move to stack on own piece (stack only)
  | 'legal-dual'      // both stack AND capture available (player must choose)
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
  pieceSize?: number
}

export const Cell: React.FC<CellProps> = ({
  pos,
  tower,
  highlight,
  onClick,
  isDark,
  pieceSize = 68,
}) => {
  const topPiece = tower ? tower[tower.length - 1] : null
  const towerHeight = tower ? tower.length : 0
  const [hovered, setHovered] = useState(false)

  const handleClick = () => onClick(pos)

  // ── Cell background color ──
  let bgClass = isDark ? 'bg-amber-900/20' : 'bg-amber-800/10'
  if (highlight === 'last-move-from' || highlight === 'last-move-to') bgClass = 'bg-amber-400/30'
  if (highlight === 'selected') bgClass = 'bg-amber-400/40'

  const isPulsing = highlight === 'legal-capture' || highlight === 'legal-dual'

  return (
    <div
      className={`relative flex items-center justify-center cursor-pointer select-none
        ${bgClass}
        border border-amber-800/40
        hover:bg-amber-400/20 transition-colors duration-100
        aspect-square`}
      onClick={handleClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleClick()}
      aria-label={`Cell ${String.fromCharCode(97 + pos.col)}${9 - pos.row}`}
    >
      {/* Tower height badge */}
      {towerHeight > 1 && (
        <span className="absolute top-0.5 right-1 text-[9px] font-bold text-amber-200/70 z-10 leading-none">
          {towerHeight}
        </span>
      )}

      {/* Piece token */}
      {topPiece && (
        <div className={`z-10 flex items-center justify-center
          ${highlight === 'selected' ? 'drop-shadow-[0_0_6px_rgba(212,160,23,0.9)]' : ''}
          ${isPulsing ? 'animate-pulse' : ''}
        `}>
          <PieceToken
            type={topPiece.type}
            owner={topPiece.owner}
            height={towerHeight}
            size={pieceSize}
            selected={highlight === 'selected'}
          />
        </div>
      )}

      {/* Legal move dot — empty square */}
      {!topPiece && (highlight === 'legal-empty' || highlight === 'legal-stack') && (
        <div className="w-3 h-3 rounded-full bg-amber-400/70 shadow-sm" />
      )}

      {/* Legal capture ring — enemy piece (capture only) */}
      {topPiece && highlight === 'legal-capture' && (
        <div className="absolute inset-1 rounded-full border-2 border-red-500/80 pointer-events-none" />
      )}

      {/* Legal stack ring — own piece (stack only) */}
      {topPiece && highlight === 'legal-stack' && (
        <div className="absolute inset-1 rounded-full border-2 border-amber-400/80 pointer-events-none" />
      )}

      {/* Dual-choice ring — both stack and capture available */}
      {topPiece && highlight === 'legal-dual' && (
        <div className="absolute inset-1 rounded-full border-2 border-yellow-300/90 pointer-events-none
          shadow-[0_0_6px_2px_rgba(253,224,71,0.35)]" />
      )}

      {/* Stack inspection tooltip — shown on hover when tower has multiple pieces */}
      {towerHeight > 1 && hovered && (
        <div
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 z-50
            pointer-events-none whitespace-nowrap
            bg-stone-900/95 border border-amber-700/50 rounded-lg
            px-2.5 py-1.5 shadow-xl"
          onClick={e => e.stopPropagation()}
        >
          <p className="text-[9px] uppercase tracking-widest text-amber-400/60 mb-1 text-center">
            Tower (top → bottom)
          </p>
          <div className="flex flex-col gap-0.5">
            {[...tower!].reverse().map((piece, i) => (
              <div key={i} className="flex items-center gap-1.5 text-xs">
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                  piece.owner === 'black' ? 'bg-red-400' : 'bg-stone-300'
                }`} />
                <span className="text-amber-100 font-medium">{KANJI[piece.type]}</span>
                <span className="text-amber-200/50">{ENGLISH[piece.type]}</span>
                {i === 0 && (
                  <span className="text-amber-400/60 text-[9px]">← active</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
