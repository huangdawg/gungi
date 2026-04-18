import type { Server, Socket } from 'socket.io'
import { auth } from '../../auth/index.js'
import { db, games } from '../../db/index.js'
import {
  getRoom,
  joinRoom,
  handleDisconnect,
  getPlayerColor,
  setRoomCompleted,
} from '../../rooms/manager.js'
import { resign } from '@gungi/engine'
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

      // Resolve session → user
      const sessionData = await auth.api.getSession({
        headers: new Headers({ cookie: `better-auth.session_token=${sessionToken}` }),
      })

      if (!sessionData) {
        socket.emit('error', { message: 'Invalid or expired session' })
        return
      }

      const userId = sessionData.user.id
      const displayName =
        (sessionData.user as { displayName?: string }).displayName ||
        clientDisplayName ||
        `Guest-${userId.slice(0, 6)}`

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

      if (isReconnect) {
        // Send full game state snapshot to reconnecting player
        socket.emit('room:joined', {
          gameState: updatedRoom.gameState,
          color,
          roomCode: normalizedCode,
          isReconnect: true,
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
