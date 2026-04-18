import React from 'react'
import type { PieceType, Player, PlayerState } from '@gungi/engine'
import { ReserveSlot } from './ReserveSlot'

// ─── All piece types in display order ────────────────────────────────────────

const PIECE_ORDER: PieceType[] = [
  'marshal',
  'pawn',
  'general',
  'major',
  'musketeer',
  'knight',
  'samurai',
  'cannon',
  'spy',
  'fortress',
  'archer',
]

interface ReservePanelProps {
  playerState: PlayerState
  owner: Player
  isMyTurn: boolean
  isMyPanel: boolean
  selectedReservePiece: PieceType | null
  onReservePieceClick: (type: PieceType) => void
  label: string
}

export const ReservePanel: React.FC<ReservePanelProps> = ({
  playerState,
  owner,
  isMyTurn,
  isMyPanel,
  selectedReservePiece,
  onReservePieceClick,
  label,
}) => {
  // Build count map
  const counts = Object.fromEntries(PIECE_ORDER.map((p) => [p, 0])) as Record<PieceType, number>
  for (const p of playerState.reserve) counts[p] = (counts[p] ?? 0) + 1

  const canDrop = isMyPanel && isMyTurn

  return (
    <div
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
          {playerState.onBoardCount}/25 on board
        </span>
      </div>

      {/* Reserve grid */}
      <div className="grid grid-cols-3 gap-x-2 gap-y-2">
        {PIECE_ORDER.map((type) => (
          <ReserveSlot
            key={type}
            type={type}
            owner={owner}
            count={counts[type]}
            selected={selectedReservePiece === type && isMyPanel}
            onClick={onReservePieceClick}
            disabled={!canDrop || counts[type] === 0}
          />
        ))}
      </div>

      {canDrop && selectedReservePiece && isMyPanel && (
        <p className="text-xs text-amber-300/80 text-center mt-1 animate-pulse">
          Click a highlighted square to place
        </p>
      )}
    </div>
  )
}
