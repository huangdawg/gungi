import { Hono } from 'hono'
import { db, games } from '../db/index.js'
import { createRoom, getRoom } from '../rooms/manager.js'
import { eq } from 'drizzle-orm'
import { randomUUID } from 'crypto'

const router = new Hono()

// ─── POST /rooms — create a new private room ─────────────────────────────────

router.post('/', async (c) => {
  try {
    const gameId = randomUUID()
    const baseUrl = process.env.BASE_URL ?? 'http://localhost:3001'

    // Create in-memory room
    const room = createRoom({
      gameId,
      creatorUserId: '', // Will be set on socket join
      creatorDisplayName: '',
    })

    // Persist to DB
    await db.insert(games).values({
      id: gameId,
      roomCode: room.roomCode,
      status: 'waiting',
    })

    return c.json({
      roomCode: room.roomCode,
      shareUrl: `${baseUrl}/room/${room.roomCode}`,
    })
  } catch (err) {
    console.error('Error creating room:', err)
    return c.json({ error: 'Failed to create room' }, 500)
  }
})

// ─── GET /rooms/:code — get room info ────────────────────────────────────────

router.get('/:code', async (c) => {
  const code = c.req.param('code').toUpperCase()

  // Check in-memory first (fast path for active games)
  const activeRoom = getRoom(code)
  if (activeRoom) {
    return c.json({
      roomCode: activeRoom.roomCode,
      status: activeRoom.status,
      blackPlayerName: activeRoom.players.black?.displayName ?? null,
      whitePlayerName: activeRoom.players.white?.displayName ?? null,
    })
  }

  // Fall back to DB (for completed games or rooms not yet joined)
  const [game] = await db
    .select()
    .from(games)
    .where(eq(games.roomCode, code))
    .limit(1)

  if (!game) {
    return c.json({ error: 'Room not found' }, 404)
  }

  return c.json({
    roomCode: game.roomCode,
    status: game.status,
    blackPlayerName: null,
    whitePlayerName: null,
  })
})

export default router
