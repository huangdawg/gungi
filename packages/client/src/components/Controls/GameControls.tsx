import React, { useState } from 'react'
import {
  emitResign,
  emitDrawOffer,
  emitDrawAccept,
  emitDrawDecline,
  emitRequestSkip,
  emitCancelSkip,
} from '../../socket/client'

interface GameControlsProps {
  drawOffered: boolean   // opponent offered a draw
  drawPending: boolean   // we offered, waiting for opponent
  gameActive: boolean
  /** Show the Skip-to-Hybrid voting UI (typically only during placement phase). */
  canSkipPlacement: boolean
  mySkipVote: boolean
  opponentSkipVote: boolean
}

export const GameControls: React.FC<GameControlsProps> = ({
  drawOffered,
  drawPending,
  gameActive,
  canSkipPlacement,
  mySkipVote,
  opponentSkipVote,
}) => {
  const [resignConfirm, setResignConfirm] = useState(false)

  if (!gameActive) return null

  const handleResign = () => {
    if (!resignConfirm) {
      setResignConfirm(true)
      return
    }
    emitResign()
    setResignConfirm(false)
  }

  const handleDrawOffer = () => {
    emitDrawOffer()
  }

  // Skip-to-Hybrid button label depends on the vote state.
  const skipLabel = mySkipVote
    ? 'Waiting for opponent...'
    : opponentSkipVote
      ? 'Opponent wants to skip — Confirm'
      : 'Skip to Hybrid Setup'
  const skipHandler = mySkipVote ? emitCancelSkip : emitRequestSkip
  const skipHighlight = opponentSkipVote && !mySkipVote

  return (
    <div className="flex flex-col gap-2">
      {/* Skip-to-Hybrid (only during placement) */}
      {canSkipPlacement && (
        <button
          onClick={skipHandler}
          className={
            'w-full py-1.5 rounded text-xs font-medium transition-colors border ' +
            (skipHighlight
              ? 'bg-amber-700/40 border-amber-500/60 text-amber-200 hover:bg-amber-600/50'
              : mySkipVote
                ? 'bg-stone-800/40 border-stone-600/40 text-stone-400 hover:text-stone-300'
                : 'border-amber-700/40 text-amber-300/70 hover:text-amber-300 hover:border-amber-600/60')
          }
        >
          {skipLabel}
        </button>
      )}

      {/* Draw offer from opponent */}
      {drawOffered && (
        <div className="flex flex-col gap-1.5 p-2.5 rounded-lg bg-amber-900/30 border border-amber-600/40">
          <p className="text-xs text-amber-300 text-center font-medium">
            Opponent offers a draw
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => emitDrawAccept()}
              className="flex-1 py-1.5 rounded bg-green-700/60 hover:bg-green-600/60
                text-xs text-green-200 font-medium transition-colors"
            >
              Accept
            </button>
            <button
              onClick={() => emitDrawDecline()}
              className="flex-1 py-1.5 rounded bg-red-700/60 hover:bg-red-600/60
                text-xs text-red-200 font-medium transition-colors"
            >
              Decline
            </button>
          </div>
        </div>
      )}

      {/* Draw pending */}
      {drawPending && !drawOffered && (
        <div className="px-2.5 py-2 rounded-lg bg-stone-800/40 border border-stone-600/30">
          <p className="text-xs text-amber-200/50 text-center">
            Draw offer sent — waiting...
          </p>
        </div>
      )}

      {/* Controls row */}
      <div className="flex gap-2">
        {/* Draw offer button */}
        {!drawPending && !drawOffered && (
          <button
            onClick={handleDrawOffer}
            className="flex-1 py-1.5 rounded border border-amber-700/40
              text-xs text-amber-300/70 hover:text-amber-300 hover:border-amber-600/60
              transition-colors"
          >
            Offer Draw
          </button>
        )}

        {/* Resign button */}
        {!resignConfirm ? (
          <button
            onClick={handleResign}
            className="flex-1 py-1.5 rounded border border-red-800/40
              text-xs text-red-400/70 hover:text-red-400 hover:border-red-700/60
              transition-colors"
          >
            Resign
          </button>
        ) : (
          <div className="flex flex-1 gap-1">
            <button
              onClick={handleResign}
              className="flex-1 py-1.5 rounded bg-red-700/60 hover:bg-red-600/60
                text-xs text-red-200 font-medium transition-colors"
            >
              Confirm Resign
            </button>
            <button
              onClick={() => setResignConfirm(false)}
              className="px-2 py-1.5 rounded border border-stone-600/40
                text-xs text-stone-400 hover:text-stone-300 transition-colors"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
