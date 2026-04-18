import type { GameState } from '@gungi/engine'

// ─── Room / Player types ──────────────────────────────────────────────────────

export type RoomStatus = 'waiting' | 'active' | 'completed'

export type PlayerColor = 'black' | 'white'

export interface Player {
  userId: string
  displayName: string
  color: PlayerColor
  socketId: string | null
  /** Whether the player is currently connected via WebSocket */
  connected: boolean
  /**
   * Timer handle for the 120-second disconnect grace window.
   * Cleared on reconnect; fires forfeit on expiry.
   */
  disconnectTimer: ReturnType<typeof setTimeout> | null
}

export interface DrawOffer {
  /** Which player offered the draw */
  offeredBy: PlayerColor
  /** Timestamp of the offer */
  offeredAt: number
}

export interface Room {
  /** 6-character alphanumeric code */
  roomCode: string
  /** Database game ID (set when game record is created) */
  gameId: string
  status: RoomStatus
  players: {
    black: Player | null
    white: Player | null
  }
  /** Current authoritative game state */
  gameState: GameState
  /** Ordered list of moves (serialized) for DB persistence */
  moveHistory: string[]
  /** Pending draw offer, if any */
  pendingDrawOffer: DrawOffer | null
  createdAt: number
}

export interface RoomState {
  roomCode: string
  status: RoomStatus
  blackPlayerName: string | null
  whitePlayerName: string | null
}
