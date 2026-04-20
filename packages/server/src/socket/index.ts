import { Server } from 'socket.io'
import type { Server as HTTPServer } from 'http'
import { registerRoomHandlers } from './handlers/room.js'
import { registerGameHandlers } from './handlers/game.js'
import { registerChatHandlers } from './handlers/chat.js'
import { socketOriginResolver } from '../cors.js'

// ─── Socket.IO server setup ───────────────────────────────────────────────────

export function createSocketServer(httpServer: HTTPServer): Server {
  const io = new Server(httpServer, {
    cors: {
      origin: socketOriginResolver,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    connectionStateRecovery: {
      // Buffer events for up to 2 minutes so reconnecting clients can recover
      maxDisconnectionDuration: 2 * 60 * 1000,
      skipMiddlewares: true,
    },
  })

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`)

    // Register all event handlers
    registerRoomHandlers(io, socket)
    registerGameHandlers(io, socket)
    registerChatHandlers(io, socket)

    socket.on('disconnect', (reason) => {
      console.log(`Socket disconnected: ${socket.id} (${reason})`)
    })
  })

  return io
}
