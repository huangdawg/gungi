import type { Server } from 'socket.io'
import { applyMove, resign, declareDraw } from '@gungi/engine'
import type { Move } from '@gungi/engine'
import { db, games, gameMoves } from '../../db/index.js'
import { getRoom, setRoomCompleted } from '../../rooms/manager.js'
import { eq } from 'drizzle-orm'
import { randomUUID } from 'crypto'
import type { SocketWithMeta } from './room.js'
import { broadcastGameOver } from './room.js'
import type { PlayerColor } from '../../rooms/types.js'

// ─── Game event handlers ──────────────────────────────────────────────────────

export function registerGameHandlers(io: Server, socket: SocketWithMeta): void {
  // ── game:move ──
  socket.on('game:move', async (payload: { moveJson: Move }) => {
    try {
      const { roomCode, userId, color } = socket
      if (!roomCode || !userId || !color) return

      const room = getRoom(roomCode)
      if (!room || room.status !== 'active') {
        socket.emit('error', { message: 'No active game in this room' })
        return
      }

      // Verify it's this player's turn
      if (room.gameState.currentPlayer !== color) {
        socket.emit('error', { message: 'Not your turn' })
        return
      }

      const move = payload.moveJson
      if (!move) {
        socket.emit('error', { message: 'moveJson is required' })
        return
      }

      // Validate + apply via rule engine
      const result = applyMove(room.gameState, move)
      if (!result.ok) {
        socket.emit('error', { message: result.error })
        return
      }

      const moveNumber = room.moveHistory.length + 1
      room.gameState = result.state
      room.moveHistory.push(JSON.stringify(move))

      // Persist move to DB
      await db
        .insert(gameMoves)
        .values({
          id: randomUUID(),
          gameId: room.gameId,
          moveNumber,
          playerId: userId,
          moveJson: move,
        })
        .catch((err) => console.error('Failed to persist move:', err))

      // Broadcast updated state to all players in the room
      io.to(roomCode).emit('game:state', { gameState: result.state })

      // Check for game over
      if (result.state.gameStatus !== 'active') {
        const winner = result.state.winner as PlayerColor | null
        const reason = result.state.gameStatus as 'checkmate' | 'resigned' | 'draw'
        broadcastGameOver(io, room, winner, reason)
      }
    } catch (err) {
      console.error('game:move error:', err)
      socket.emit('error', { message: 'Failed to process move' })
    }
  })

  // ── game:resign ──
  socket.on('game:resign', async () => {
    try {
      const { roomCode, userId, color } = socket
      if (!roomCode || !userId || !color) return

      const room = getRoom(roomCode)
      if (!room || room.status !== 'active') {
        socket.emit('error', { message: 'No active game in this room' })
        return
      }

      const newState = resign(room.gameState, color)
      room.gameState = newState

      const winner: PlayerColor = color === 'black' ? 'white' : 'black'
      broadcastGameOver(io, room, winner, 'resigned')
    } catch (err) {
      console.error('game:resign error:', err)
      socket.emit('error', { message: 'Failed to process resign' })
    }
  })

  // ── game:draw-offer ──
  socket.on('game:draw-offer', () => {
    try {
      const { roomCode, color } = socket
      if (!roomCode || !color) return

      const room = getRoom(roomCode)
      if (!room || room.status !== 'active') {
        socket.emit('error', { message: 'No active game in this room' })
        return
      }

      if (room.pendingDrawOffer) {
        socket.emit('error', { message: 'A draw offer is already pending' })
        return
      }

      room.pendingDrawOffer = { offeredBy: color, offeredAt: Date.now() }

      // Notify opponent only
      socket.to(roomCode).emit('game:draw-offered', { offeredBy: color })
    } catch (err) {
      console.error('game:draw-offer error:', err)
      socket.emit('error', { message: 'Failed to offer draw' })
    }
  })

  // ── game:draw-accept ──
  socket.on('game:draw-accept', async () => {
    try {
      const { roomCode, color } = socket
      if (!roomCode || !color) return

      const room = getRoom(roomCode)
      if (!room || room.status !== 'active') {
        socket.emit('error', { message: 'No active game in this room' })
        return
      }

      // Verify the offer is for this player to accept
      if (!room.pendingDrawOffer) {
        socket.emit('error', { message: 'No pending draw offer' })
        return
      }

      if (room.pendingDrawOffer.offeredBy === color) {
        socket.emit('error', { message: 'Cannot accept your own draw offer' })
        return
      }

      room.pendingDrawOffer = null
      const newState = declareDraw(room.gameState)
      room.gameState = newState

      broadcastGameOver(io, room, null, 'draw')
    } catch (err) {
      console.error('game:draw-accept error:', err)
      socket.emit('error', { message: 'Failed to accept draw' })
    }
  })

  // ── game:draw-decline ──
  socket.on('game:draw-decline', () => {
    try {
      const { roomCode, color } = socket
      if (!roomCode || !color) return

      const room = getRoom(roomCode)
      if (!room || room.status !== 'active') {
        socket.emit('error', { message: 'No active game in this room' })
        return
      }

      if (!room.pendingDrawOffer) {
        socket.emit('error', { message: 'No pending draw offer' })
        return
      }

      if (room.pendingDrawOffer.offeredBy === color) {
        socket.emit('error', { message: 'Cannot decline your own draw offer' })
        return
      }

      const offeredBy = room.pendingDrawOffer.offeredBy
      room.pendingDrawOffer = null

      // Notify the player who offered that it was declined
      socket.to(roomCode).emit('game:draw-declined', { declinedBy: color })
      // Also tell the decliner that the offer is cleared
      socket.emit('game:draw-declined', { declinedBy: color })
    } catch (err) {
      console.error('game:draw-decline error:', err)
      socket.emit('error', { message: 'Failed to decline draw' })
    }
  })
}
