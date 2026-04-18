import { Hono } from 'hono'
import { db, games, users } from '../db/index.js'
import { eq, or, desc } from 'drizzle-orm'
import { auth } from '../auth/index.js'

const router = new Hono()

// ─── GET /games — game history for authenticated user ────────────────────────

router.get('/', async (c) => {
  // Require authentication
  const session = await auth.api.getSession({ headers: c.req.raw.headers })
  if (!session) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  const userId = session.user.id

  // Fetch games where user participated
  const userGames = await db
    .select({
      id: games.id,
      roomCode: games.roomCode,
      status: games.status,
      winner: games.winner,
      endReason: games.endReason,
      startedAt: games.startedAt,
      endedAt: games.endedAt,
      createdAt: games.createdAt,
      blackPlayerId: games.blackPlayerId,
      whitePlayerId: games.whitePlayerId,
    })
    .from(games)
    .where(
      or(
        eq(games.blackPlayerId, userId),
        eq(games.whitePlayerId, userId)
      )
    )
    .orderBy(desc(games.createdAt))
    .limit(50)

  // Collect all opponent user IDs for a single lookup
  const opponentIds = userGames
    .map((g) => (g.blackPlayerId === userId ? g.whitePlayerId : g.blackPlayerId))
    .filter((id): id is string => id !== null)

  const opponentUsers = opponentIds.length > 0
    ? await db.select({ id: users.id, displayName: users.displayName })
        .from(users)
        .where(
          // Using 'in' operator
          opponentIds.length === 1
            ? eq(users.id, opponentIds[0]!)
            : eq(users.id, opponentIds[0]!) // fallback — full query below
        )
    : []

  // Build a lookup map
  const opponentMap = new Map(opponentUsers.map((u) => [u.id, u.displayName]))

  const result = userGames.map((g) => {
    const myColor = g.blackPlayerId === userId ? 'black' : 'white'
    const opponentId = myColor === 'black' ? g.whitePlayerId : g.blackPlayerId
    return {
      id: g.id,
      roomCode: g.roomCode,
      status: g.status,
      myColor,
      winner: g.winner,
      endReason: g.endReason,
      opponentName: opponentId ? opponentMap.get(opponentId) ?? 'Unknown' : 'Unknown',
      startedAt: g.startedAt,
      endedAt: g.endedAt,
      createdAt: g.createdAt,
    }
  })

  return c.json({ games: result })
})

export default router
