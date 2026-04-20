import React from 'react'
import type { PieceType, Player } from '@gungi/engine'
import { PieceToken } from '../Board/PieceToken'

interface ReserveSlotProps {
  type: PieceType
  owner: Player
  count: number
  selected: boolean
  onClick: (type: PieceType) => void
  disabled: boolean
}

export const ReserveSlot: React.FC<ReserveSlotProps> = ({
  type,
  owner,
  count,
  selected,
  onClick,
  disabled,
}) => {
  if (count === 0 && !selected) {
    return (
      <div className="flex flex-col items-center gap-1 opacity-25 cursor-not-allowed select-none">
        <PieceToken type={type} owner={owner} height={1} size={52} reserve />
        <span className="text-xs text-amber-200/50">0</span>
      </div>
    )
  }

  return (
    <button
      onClick={() => !disabled && onClick(type)}
      disabled={disabled || count === 0}
      className={`flex flex-col items-center gap-1 rounded-md p-1 transition-all duration-100
        ${selected
          ? 'bg-amber-400/30 ring-2 ring-amber-400 shadow-lg shadow-amber-400/30'
          : 'hover:bg-amber-400/10 cursor-pointer'
        }
        ${disabled || count === 0 ? 'opacity-40 cursor-not-allowed' : ''}
      `}
    >
      <PieceToken
        type={type}
        owner={owner}
        height={1}
        size={52}
        selected={selected}
        reserve
      />
      <span
        className={`text-xs font-bold ${selected ? 'text-amber-300' : 'text-amber-200/70'}`}
      >
        ×{count}
      </span>
    </button>
  )
}
