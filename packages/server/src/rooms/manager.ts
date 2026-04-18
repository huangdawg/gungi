import { createInitialState } from '@gungi/engine'
import type { Room, Player, PlayerColor, RoomStatus } from './types.js'

// ─── Room Manager ─────────────────────────────────────────────────────────────

/**
 * In-memory store for all active game rooms.
 * Key = 6-character room code (e.g. "ABC123")
 */
const rooms = new Map<string, Room>()

// Mapping: userId → roomCode (for reconnect lookups)
const userRoomIndex = new Map<string, string>()

// ─── Code generation ──────────────────────────────────────────────────────────

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // Remove confusables: 0/O, 1/I

function generateRoomCode(): string {
  let code: string
  do {
    code = Array.from({ length: 6 }, () =>
      CHARS[Math.floor(Math.random() * CHARS.length)]
    ).join('')
  } while (rooms.has(code))
  return code
}

// ─── Create room ──────────────────────────────────────────────────────────────

export interface CreateRoomOptions {
  gameId: string
  creatorUserId: string
  creatorDisplayName: string
}

export function createRoom(opts: CreateRoomOptions): Room {
  const roomCode = generateRoomCode()

  const room: Room = {
    roomCode,
    gameId: opts.gameId,
    status: 'waiting',
    players: {
      black: null,
      white: null,
    },
    gameState: createInitialState(),
    moveHistory: [],
    pendingDrawOffer: null,
    createdAt: Date.now(),
  }

  rooms.set(roomCode, room)
  return room
}

// ─── Get room ─────────────────────────────────────────────────────────────────

export function getRoom(roomCode: string): Room | null {
  return rooms.get(roomCode) ?? null
}

// ─── Assign player to room ────────────────────────────────────────────────────

export interface JoinRoomOptions {
  roomCode: string
  userId: string
  displayName: string
  socketId: string
}

export type JoinRoomResult =
  | { ok: true; color: PlayerColor; room: Room; isReconnect: boolean }
  | { ok: false; error: string }

export function joinRoom(opts: JoinRoomOptions): JoinRoomResult {
  const room = rooms.get(opts.roomCode)
  if (!room) {
    return { ok: false, error: 'Room not found' }
  }

  if (room.status === 'completed') {
    return { ok: false, error: 'Game already completed' }
  }

  // Check if this user is already in the room (reconnect)
  const existingColor = getPlayerColor(room, opts.userId)
  if (existingColor) {
    const player = room.players[existingColor]!
    // Cancel any pending disconnect timer
    if (player.disconnectTimer) {
      clearTimeout(player.disconnectTimer)
      player.disconnectTimer = null
    }
    player.socketId = opts.socketId
    player.connected = true
    userRoomIndex.set(opts.userId, opts.roomCode)
    return { ok: true, color: existingColor, room, isReconnect: true }
  }

  // Assign the first available color
  let assignedColor: PlayerColor
  if (!room.players.black) {
    assignedColor = 'black'
  } else if (!room.players.white) {
    assignedColor = 'white'
  } else {
    return { ok: false, error: 'Room is full' }
  }

  const player: Player = {
    userId: opts.userId,
    displayName: opts.displayName,
    color: assignedColor,
    socketId: opts.socketId,
    connected: true,
    disconnectTimer: null,
  }

  room.players[assignedColor] = player
  userRoomIndex.set(opts.userId, opts.roomCode)

  // Start game when both players have joined
  if (room.players.black && room.players.white && room.status === 'waiting') {
    room.status = 'active'
  }

  return { ok: true, color: assignedColor, room, isReconnect: false }
}

// ─── Find player color ────────────────────────────────────────────────────────

export function getPlayerColor(room: Room, userId: string): PlayerColor | null {
  if (room.players.black?.userId === userId) return 'black'
  if (room.players.white?.userId === userId) return 'white'
  return null
}

// ─── Disconnect handling ──────────────────────────────────────────────────────

export interface DisconnectOptions {
  roomCode: string
  userId: string
  /** Called when the 120-second grace window expires */
  onForfeit: (room: Room, forfeitedColor: PlayerColor) => void
}

const DISCONNECT_GRACE_MS = 120_000 // 120 seconds

export function handleDisconnect(opts: DisconnectOptions): void {
  const room = rooms.get(opts.roomCode)
  if (!room || room.status !== 'active') return

  const color = getPlayerColor(room, opts.userId)
  if (!color) return

  const player = room.players[color]!
  player.connected = false
  player.socketId = null

  // Start the grace window timer
  player.disconnectTimer = setTimeout(() => {
    const currentRoom = rooms.get(opts.roomCode)
    if (!currentRoom || currentRoom.status !== 'active') return
    const currentPlayer = currentRoom.players[color]
    if (!currentPlayer || currentPlayer.connected) return
    // Grace window expired — forfeit
    opts.onForfeit(currentRoom, color)
  }, DISCONNECT_GRACE_MS)
}

// ─── Room lookup by userId ────────────────────────────────────────────────────

export function getRoomByUserId(userId: string): Room | null {
  const roomCode = userRoomIndex.get(userId)
  if (!roomCode) return null
  return rooms.get(roomCode) ?? null
}

// ─── Update room status ───────────────────────────────────────────────────────

export function setRoomCompleted(roomCode: string): void {
  const room = rooms.get(roomCode)
  if (room) {
    room.status = 'completed'
  }
}

// ─── Remove room ──────────────────────────────────────────────────────────────

export function removeRoom(roomCode: string): void {
  const room = rooms.get(roomCode)
  if (room) {
    // Clear any pending timers
    for (const color of ['black', 'white'] as PlayerColor[]) {
      const player = room.players[color]
      if (player?.disconnectTimer) {
        clearTimeout(player.disconnectTimer)
      }
    }
    // Remove user index entries
    for (const color of ['black', 'white'] as PlayerColor[]) {
      const player = room.players[color]
      if (player) {
        userRoomIndex.delete(player.userId)
      }
    }
    rooms.delete(roomCode)
  }
}

// ─── Test helpers ─────────────────────────────────────────────────────────────

/** Exposed only for testing — clears all in-memory state */
export function _clearAllRooms(): void {
  for (const code of rooms.keys()) {
    removeRoom(code)
  }
}

export { rooms, userRoomIndex }
