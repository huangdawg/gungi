import React from 'react'
import type { PieceType, Player, PlayerState, GameMode } from '@gungi/engine'
import { MODES } from '@gungi/engine'
import { ReserveSlot } from './ReserveSlot'

// ─── Display layout ───────────────────────────────────────────────────────────
// Each row is a horizontal group of piece types, rendered centered. Types that
// aren't in the current mode (pieceCount === 0) are filtered out.

const ROWS_NORMAL: PieceType[][] = [
  ['marshal'],
  ['pawn', 'major', 'general'],
  ['musketeer', 'knight', 'fortress'],
  ['cannon', 'samurai', 'archer'],
  ['spy'],
]

const ROWS_MINI: PieceType[][] = [
  ['marshal'],
  ['pawn', 'general'],
  ['musketeer', 'knight', 'fortress'],
  ['samurai', 'archer'],
]

interface ReservePanelProps {
  playerState: PlayerState
  owner: Player
  isMyTurn: boolean
  isMyPanel: boolean
  selectedReservePiece: PieceType | null
  onReservePieceClick: (type: PieceType) => void
  label: string
  mode: GameMode
}

export const ReservePanel: React.FC<ReservePanelProps> = ({
  playerState,
  owner,
  isMyTurn,
  isMyPanel,
  selectedReservePiece,
  onReservePieceClick,
  label,
  mode,
}) => {
  const cfg = MODES[mode]
  const baseRows = mode === 'mini' ? ROWS_MINI : ROWS_NORMAL
  // Drop any type that doesn't exist in this mode (pieceCount === 0). Then drop
  // any row that ends up empty so we don't render blank gaps.
  const rows = baseRows
    .map((row) => row.filter((t) => cfg.pieceCounts[t] > 0))
    .filter((row) => row.length > 0)

  // Build count map from reserve
  const counts: Record<PieceType, number> = {
    marshal: 0, pawn: 0, general: 0, major: 0, musketeer: 0, knight: 0,
    samurai: 0, cannon: 0, spy: 0, fortress: 0, archer: 0,
  }
  for (const p of playerState.reserve) counts[p] = (counts[p] ?? 0) + 1

  const canDrop = isMyPanel && isMyTurn
  const mustPlaceMarshal = canDrop && playerState.placedCount === 0 && playerState.reserve.includes('marshal')

  return (
    <div
      data-game-surface
      className={`flex flex-col gap-2 px-3 py-3 rounded-lg
        ${isMyPanel
          ? 'bg-amber-900/40 border border-amber-700/50'
          : 'bg-stone-900/40 border border-stone-700/40'
        }
      `}
    >
      <div className="flex items-center justify-between mb-1">
        <span className={`text-xs font-semibold uppercase tracking-wide
          ${isMyPanel ? 'text-amber-300' : 'text-stone-400'}`}>
          {label}
        </span>
        <span className="text-xs text-amber-200/50">
          {playerState.onBoardCount}/{cfg.maxOnBoard} on board
        </span>
      </div>

      {mustPlaceMarshal && (
        <p className="text-xs text-amber-400 text-center font-semibold animate-pulse">
          Place Marshal (帅) first
        </p>
      )}

      {rows.map((row, i) => (
        <div key={i} className="flex justify-center gap-2">
          {row.map((type) => (
            <ReserveSlot
              key={type}
              type={type}
              owner={owner}
              count={counts[type]}
              selected={selectedReservePiece === type && isMyPanel}
              onClick={onReservePieceClick}
              disabled={!canDrop || counts[type] === 0 || (mustPlaceMarshal && type !== 'marshal')}
            />
          ))}
        </div>
      ))}

      {canDrop && selectedReservePiece && isMyPanel && (
        <p className="text-xs text-amber-300/80 text-center mt-1 animate-pulse">
          Click a highlighted square to place
        </p>
      )}
    </div>
  )
}
