/**
 * Room manager unit tests — covers in-memory room lifecycle,
 * join/reconnect logic, and disconnect grace window.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  createRoom,
  getRoom,
  joinRoom,
  handleDisconnect,
  getPlayerColor,
  _clearAllRooms,
  rooms,
} from '../rooms/manager.js'

describe('Room Manager', () => {
  beforeEach(() => {
    _clearAllRooms()
  })

  afterEach(() => {
    _clearAllRooms()
    vi.useRealTimers()
  })

  // ─── createRoom ──────────────────────────────────────────────────────────────

  describe('createRoom', () => {
    it('creates a room with a 6-character code', () => {
      const room = createRoom({ gameId: 'g1', creatorUserId: 'u1', creatorDisplayName: 'Alice' })
      expect(room.roomCode).toHaveLength(6)
      expect(room.status).toBe('waiting')
    })

    it('creates rooms with unique codes', () => {
      const codes = new Set(
        Array.from({ length: 10 }, () =>
          createRoom({ gameId: `g${Math.random()}`, creatorUserId: 'u1', creatorDisplayName: '' }).roomCode
        )
      )
      expect(codes.size).toBe(10)
    })

    it('stores the room in memory', () => {
      const room = createRoom({ gameId: 'g1', creatorUserId: 'u1', creatorDisplayName: '' })
      expect(getRoom(room.roomCode)).toBe(room)
    })

    it('returns null for unknown room codes', () => {
      expect(getRoom('ZZZZZZ')).toBeNull()
    })
  })

  // ─── joinRoom ─────────────────────────────────────────────────────────────────

  describe('joinRoom', () => {
    it('first player gets black', () => {
      const room = createRoom({ gameId: 'g1', creatorUserId: '', creatorDisplayName: '' })
      const result = joinRoom({ roomCode: room.roomCode, userId: 'u1', displayName: 'Alice', socketId: 's1' })
      expect(result.ok).toBe(true)
      if (result.ok) expect(result.color).toBe('black')
    })

    it('second player gets white and game becomes active', () => {
      const room = createRoom({ gameId: 'g1', creatorUserId: '', creatorDisplayName: '' })
      joinRoom({ roomCode: room.roomCode, userId: 'u1', displayName: 'Alice', socketId: 's1' })
      const result = joinRoom({ roomCode: room.roomCode, userId: 'u2', displayName: 'Bob', socketId: 's2' })
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.color).toBe('white')
        expect(result.room.status).toBe('active')
      }
    })

    it('rejects a third player when room is full', () => {
      const room = createRoom({ gameId: 'g1', creatorUserId: '', creatorDisplayName: '' })
      joinRoom({ roomCode: room.roomCode, userId: 'u1', displayName: 'A', socketId: 's1' })
      joinRoom({ roomCode: room.roomCode, userId: 'u2', displayName: 'B', socketId: 's2' })
      const result = joinRoom({ roomCode: room.roomCode, userId: 'u3', displayName: 'C', socketId: 's3' })
      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.error).toBe('Room is full')
    })

    it('rejects join to unknown room', () => {
      const result = joinRoom({ roomCode: 'NOROOM', userId: 'u1', displayName: 'A', socketId: 's1' })
      expect(result.ok).toBe(false)
    })
  })

  // ─── reconnect ────────────────────────────────────────────────────────────────

  describe('reconnect', () => {
    it('recognizes a rejoining player and marks isReconnect=true', () => {
      const room = createRoom({ gameId: 'g1', creatorUserId: '', creatorDisplayName: '' })
      joinRoom({ roomCode: room.roomCode, userId: 'u1', displayName: 'A', socketId: 's1' })
      joinRoom({ roomCode: room.roomCode, userId: 'u2', displayName: 'B', socketId: 's2' })

      // Simulate reconnect by same userId with new socketId
      const result = joinRoom({ roomCode: room.roomCode, userId: 'u1', displayName: 'A', socketId: 's1-new' })
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.isReconnect).toBe(true)
        expect(result.color).toBe('black')
      }
    })

    it('cancels the disconnect timer on reconnect', () => {
      vi.useFakeTimers()
      const forfeit = vi.fn()
      const room = createRoom({ gameId: 'g1', creatorUserId: '', creatorDisplayName: '' })
      joinRoom({ roomCode: room.roomCode, userId: 'u1', displayName: 'A', socketId: 's1' })
      joinRoom({ roomCode: room.roomCode, userId: 'u2', displayName: 'B', socketId: 's2' })

      // Disconnect u1
      handleDisconnect({ roomCode: room.roomCode, userId: 'u1', onForfeit: forfeit })
      expect(room.players.black!.connected).toBe(false)

      // Reconnect before timer fires
      joinRoom({ roomCode: room.roomCode, userId: 'u1', displayName: 'A', socketId: 's1-new' })
      expect(room.players.black!.connected).toBe(true)
      expect(room.players.black!.disconnectTimer).toBeNull()

      // Advance time past grace window — forfeit should NOT fire
      vi.advanceTimersByTime(150_000)
      expect(forfeit).not.toHaveBeenCalled()
    })
  })

  // ─── disconnect grace window ──────────────────────────────────────────────────

  describe('disconnect grace window', () => {
    it('calls onForfeit after 120 seconds if player does not reconnect', () => {
      vi.useFakeTimers()
      const forfeit = vi.fn()
      const room = createRoom({ gameId: 'g1', creatorUserId: '', creatorDisplayName: '' })
      joinRoom({ roomCode: room.roomCode, userId: 'u1', displayName: 'A', socketId: 's1' })
      joinRoom({ roomCode: room.roomCode, userId: 'u2', displayName: 'B', socketId: 's2' })

      handleDisconnect({ roomCode: room.roomCode, userId: 'u1', onForfeit: forfeit })

      vi.advanceTimersByTime(119_999)
      expect(forfeit).not.toHaveBeenCalled()

      vi.advanceTimersByTime(1)
      expect(forfeit).toHaveBeenCalledOnce()
      expect(forfeit).toHaveBeenCalledWith(room, 'black')
    })

    it('does not forfeit for completed games', () => {
      vi.useFakeTimers()
      const forfeit = vi.fn()
      const room = createRoom({ gameId: 'g1', creatorUserId: '', creatorDisplayName: '' })
      joinRoom({ roomCode: room.roomCode, userId: 'u1', displayName: 'A', socketId: 's1' })
      joinRoom({ roomCode: room.roomCode, userId: 'u2', displayName: 'B', socketId: 's2' })

      handleDisconnect({ roomCode: room.roomCode, userId: 'u1', onForfeit: forfeit })

      // Mark game completed before timer fires
      room.status = 'completed'

      vi.advanceTimersByTime(200_000)
      expect(forfeit).not.toHaveBeenCalled()
    })
  })

  // ─── getPlayerColor ───────────────────────────────────────────────────────────

  describe('getPlayerColor', () => {
    it('returns the color for a player in the room', () => {
      const room = createRoom({ gameId: 'g1', creatorUserId: '', creatorDisplayName: '' })
      joinRoom({ roomCode: room.roomCode, userId: 'u1', displayName: 'A', socketId: 's1' })
      joinRoom({ roomCode: room.roomCode, userId: 'u2', displayName: 'B', socketId: 's2' })
      expect(getPlayerColor(room, 'u1')).toBe('black')
      expect(getPlayerColor(room, 'u2')).toBe('white')
    })

    it('returns null for unknown user', () => {
      const room = createRoom({ gameId: 'g1', creatorUserId: '', creatorDisplayName: '' })
      expect(getPlayerColor(room, 'nobody')).toBeNull()
    })
  })
})
