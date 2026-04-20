import 'dotenv/config'
import { getRequestListener } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { createServer } from 'http'
import roomsRouter from './routes/rooms.js'
import authRouter from './routes/auth.js'
import gamesRouter from './routes/games.js'
import { createSocketServer } from './socket/index.js'
import { honoOriginResolver } from './cors.js'

// ─── Hono app ─────────────────────────────────────────────────────────────────

const app = new Hono()

// Middleware
app.use('*', logger())
app.use(
  '*',
  cors({
    origin: honoOriginResolver,
    credentials: true,
  })
)

// Health check
app.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }))

// Routes — mounted under /api to match client fetches (Vite proxies /api → server)
app.route('/api/rooms', roomsRouter)
app.route('/api/auth', authRouter)
app.route('/api/games', gamesRouter)

// ─── HTTP server with Socket.IO ───────────────────────────────────────────────

const port = Number(process.env.PORT ?? 3001)

// Create a raw Node HTTP server so Socket.IO can attach to it
const httpServer = createServer(getRequestListener(app.fetch))

// Attach Socket.IO
const io = createSocketServer(httpServer)

httpServer.listen(port, () => {
  console.log(`Gungi server running on http://localhost:${port}`)
})

export { app, io }
