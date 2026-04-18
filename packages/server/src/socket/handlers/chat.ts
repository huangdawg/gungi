import type { Server } from 'socket.io'
import { getRoom } from '../../rooms/manager.js'
import type { SocketWithMeta } from './room.js'

// ─── Chat event handlers ──────────────────────────────────────────────────────

const MAX_MESSAGE_LENGTH = 500

export function registerChatHandlers(io: Server, socket: SocketWithMeta): void {
  // ── chat:message ──
  socket.on('chat:message', (payload: { text: string }) => {
    try {
      const { roomCode, color } = socket
      if (!roomCode || !color) return

      const room = getRoom(roomCode)
      if (!room) return

      const text = String(payload?.text ?? '').trim()
      if (!text) return
      if (text.length > MAX_MESSAGE_LENGTH) {
        socket.emit('error', { message: `Message too long (max ${MAX_MESSAGE_LENGTH} chars)` })
        return
      }

      const player = room.players[color]
      const from = player?.displayName ?? 'Unknown'

      // Broadcast to all players in the room (including sender)
      io.to(roomCode).emit('chat:message', {
        from,
        color,
        text,
        timestamp: Date.now(),
      })
    } catch (err) {
      console.error('chat:message error:', err)
    }
  })
}
