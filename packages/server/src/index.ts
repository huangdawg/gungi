import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { createServer } from 'http'
import roomsRouter from './routes/rooms.js'
import authRouter from './routes/auth.js'
import gamesRouter from './routes/games.js'
import { createSocketServer } from './socket/index.js'

// ─── Hono app ─────────────────────────────────────────────────────────────────

const app = new Hono()

// Middleware
app.use('*', logger())
app.use(
  '*',
  cors({
    origin: process.env.CLIENT_URL ?? 'http://localhost:5173',
    credentials: true,
  })
)

// Health check
app.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }))

// Routes
app.route('/rooms', roomsRouter)
app.route('/auth', authRouter)
app.route('/games', gamesRouter)

// ─── HTTP server with Socket.IO ───────────────────────────────────────────────

const port = Number(process.env.PORT ?? 3001)

// Create a raw Node HTTP server so Socket.IO can attach to it
const httpServer = createServer()

// Attach Hono to the HTTP server
httpServer.on('request', (req, res) => {
  serve({ fetch: app.fetch, port }, () => {})(req, res)
})

// Attach Socket.IO
const io = createSocketServer(httpServer)

httpServer.listen(port, () => {
  console.log(`Gungi server running on http://localhost:${port}`)
})

export { app, io }
