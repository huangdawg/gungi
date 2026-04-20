import type { Server, Socket } from 'socket.io'
import { db, games, sessions, users } from '../../db/index.js'
import {
  getRoom,
  joinRoom,
  handleDisconnect,
  getPlayerColor,
  setRoomCompleted,
} from '../../rooms/manager.js'
import { resign, buildPreset } from '@gungi/engine'
import type { DebugPreset } from '@gungi/engine'
import { eq } from 'drizzle-orm'
import type { Room } from '../../rooms/types.js'
import type { PlayerColor } from '../../rooms/types.js'

// ─── Helper: broadcast game over ─────────────────────────────────────────────

export function broadcastGameOver(
  io: Server,
  room: Room,
  winner: PlayerColor | null,
  reason: 'checkmate' | 'resigned' | 'draw' | 'forfeit'
): void {
  io.to(room.roomCode).emit('game:over', { winner, reason })

  // Persist to DB
  setRoomCompleted(room.roomCode)
  db.update(games)
    .set({
      status: 'completed',
      winner,
      endReason: reason,
      endedAt: new Date(),
    })
    .where(eq(games.roomCode, room.roomCode))
    .catch((err) => console.error('Failed to update game end:', err))
}

// ─── room:join handler ────────────────────────────────────────────────────────

export interface RoomJoinPayload {
  roomCode: string
  sessionToken: string
  displayName?: string
}

export function registerRoomHandlers(
  io: Server,
  socket: Socket
): void {
  // ── room:join ──
  socket.on('room:join', async (payload: RoomJoinPayload) => {
    try {
      const { roomCode, sessionToken, displayName: clientDisplayName } = payload

      if (!roomCode || !sessionToken) {
        socket.emit('error', { message: 'roomCode and sessionToken are required' })
        return
      }

      const normalizedCode = roomCode.toUpperCase()

      // Resolve session → user. better-auth stores a signed cookie on the
      // browser, but we only have the bare token here (sent in the join payload),
      // so look the session up directly. The cookie-based path can't work here
      // anyway in cross-origin deployments where the auth cookie won't reach
      // the server unless explicitly configured for SameSite=None.
      const [sessionRow] = await db
        .select({ userId: sessions.userId, expiresAt: sessions.expiresAt })
        .from(sessions)
        .where(eq(sessions.token, sessionToken))
        .limit(1)

      if (!sessionRow || sessionRow.expiresAt < new Date()) {
        socket.emit('error', { message: 'Invalid or expired session' })
        return
      }

      const [user] = await db
        .select({ id: users.id, displayName: users.displayName })
        .from(users)
        .where(eq(users.id, sessionRow.userId))
        .limit(1)

      if (!user) {
        socket.emit('error', { message: 'User not found' })
        return
      }

      const userId = user.id
      const displayName =
        user.displayName || clientDisplayName || `Guest-${userId.slice(0, 6)}`

      const room = getRoom(normalizedCode)
      if (!room) {
        socket.emit('error', { message: 'Room not found' })
        return
      }

      const result = joinRoom({
        roomCode: normalizedCode,
        userId,
        displayName,
        socketId: socket.id,
      })

      if (!result.ok) {
        socket.emit('error', { message: result.error })
        return
      }

      const { color, room: updatedRoom, isReconnect } = result

      // Join Socket.IO room
      socket.join(normalizedCode)

      // Attach metadata to socket for later use
      ;(socket as SocketWithMeta).roomCode = normalizedCode
      ;(socket as SocketWithMeta).userId = userId
      ;(socket as SocketWithMeta).color = color

      const opponentColor: PlayerColor = color === 'black' ? 'white' : 'black'
      const opponentName = updatedRoom.players[opponentColor]?.displayName ?? null

      if (isReconnect) {
        // Send full game state snapshot to reconnecting player
        socket.emit('room:joined', {
          gameState: updatedRoom.gameState,
          color,
          roomCode: normalizedCode,
          isReconnect: true,
          opponentName,
        })

        // Notify opponent that player reconnected
        socket.to(normalizedCode).emit('room:opponent-reconnected', { displayName })
      } else {
        // New join
        socket.emit('room:joined', {
          gameState: updatedRoom.gameState,
          color,
          roomCode: normalizedCode,
          isReconnect: false,
          opponentName,
        })

        // Update DB with player assignment
        const updateField =
          color === 'black' ? { blackPlayerId: userId } : { whitePlayerId: userId }
        await db
          .update(games)
          .set(updateField)
          .where(eq(games.roomCode, normalizedCode))
          .catch((err) =>
            console.error('Failed to update player assignment:', err)
          )

        // Notify opponent that the other player joined
        socket.to(normalizedCode).emit('room:opponent-joined', { displayName })

        // If game just became active, update DB start time
        if (updatedRoom.status === 'active') {
          await db
            .update(games)
            .set({ status: 'active', startedAt: new Date() })
            .where(eq(games.roomCode, normalizedCode))
            .catch((err) =>
              console.error('Failed to update game start:', err)
            )
        }
      }
    } catch (err) {
      console.error('room:join error:', err)
      socket.emit('error', { message: 'Failed to join room' })
    }
  })

  // ── debug:set-state ── dev-only. Either player can fast-forward the room
  // to a preset state for testing endgame scenarios; the new state is broadcast
  // to both players so they stay in sync.
  socket.on('debug:set-state', (payload: { preset: DebugPreset }) => {
    if (process.env.NODE_ENV === 'production') return
    const meta = socket as SocketWithMeta
    if (!meta.roomCode) return
    const room = getRoom(meta.roomCode)
    if (!room) return

    // Pass room.mode so the preset builder produces a state with the right
    // board size — otherwise mini rooms got a 9x9 hybrid state and broke.
    const newState = buildPreset(payload.preset, room.mode)
    room.gameState = newState
    io.to(meta.roomCode).emit('game:state', { gameState: newState })
    console.log(`[debug] room ${meta.roomCode} (${room.mode}) → preset=${payload.preset}`)
  })

  // ── room:request-skip ── production-safe. Both players must vote yes to
  // fast-forward to the hybrid preset. Server tracks votes per room; once both
  // are in, applies the new state and broadcasts.
  socket.on('room:request-skip', () => {
    const meta = socket as SocketWithMeta
    if (!meta.roomCode || !meta.color) return
    const room = getRoom(meta.roomCode)
    if (!room || room.status !== 'active') return

    room.pendingSkipVotes.add(meta.color)

    if (room.pendingSkipVotes.has('black') && room.pendingSkipVotes.has('white')) {
      // Both agreed — apply the mode-appropriate hybrid preset.
      const newState = buildPreset('hybrid', room.mode)
      room.gameState = newState
      room.pendingSkipVotes.clear()
      io.to(meta.roomCode).emit('game:state', { gameState: newState })
      io.to(meta.roomCode).emit('room:skip-vote', { votes: [] })
    } else {
      // First vote — let the other player know.
      io.to(meta.roomCode).emit('room:skip-vote', {
        votes: Array.from(room.pendingSkipVotes),
      })
    }
  })

  // ── room:cancel-skip ── withdraw a pending vote.
  socket.on('room:cancel-skip', () => {
    const meta = socket as SocketWithMeta
    if (!meta.roomCode || !meta.color) return
    const room = getRoom(meta.roomCode)
    if (!room) return
    if (!room.pendingSkipVotes.has(meta.color)) return

    room.pendingSkipVotes.delete(meta.color)
    io.to(meta.roomCode).emit('room:skip-vote', {
      votes: Array.from(room.pendingSkipVotes),
    })
  })

  // ── disconnect handler ──
  socket.on('disconnect', () => {
    const meta = socket as SocketWithMeta
    if (!meta.roomCode || !meta.userId) return

    const room = getRoom(meta.roomCode)
    if (!room || room.status !== 'active') return

    // Notify opponent
    socket.to(meta.roomCode).emit('room:opponent-disconnected', {
      message: 'Opponent disconnected. Waiting 120 seconds...',
    })

    handleDisconnect({
      roomCode: meta.roomCode,
      userId: meta.userId,
      onForfeit: (forfeitRoom, forfeitedColor) => {
        const winner: PlayerColor = forfeitedColor === 'black' ? 'white' : 'black'
        const updatedState = resign(forfeitRoom.gameState, forfeitedColor)
        forfeitRoom.gameState = updatedState
        broadcastGameOver(io, forfeitRoom, winner, 'forfeit')
      },
    })
  })
}

// ─── Socket metadata interface ────────────────────────────────────────────────

export interface SocketWithMeta extends Socket {
  roomCode?: string
  userId?: string
  color?: PlayerColor
}
