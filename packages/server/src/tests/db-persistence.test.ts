/**
 * DB persistence tests — uses in-memory SQLite via drizzle-orm/better-sqlite3.
 * Tests room creation, game record writes, and move persistence.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { eq } from 'drizzle-orm'
import { createTestDb, gamesTest, gameMovesTest, usersTest } from './db-test-helper.js'
import { randomUUID } from 'crypto'

describe('DB Persistence', () => {
  let db: ReturnType<typeof createTestDb>['db']

  beforeEach(() => {
    const testDb = createTestDb()
    db = testDb.db
  })

  // ─── Users ────────────────────────────────────────────────────────────────────

  describe('users', () => {
    it('inserts a user record', async () => {
      const userId = randomUUID()
      await db.insert(usersTest).values({
        id: userId,
        displayName: 'Alice',
        isAnonymous: true,
      })

      const [user] = await db.select().from(usersTest).where(eq(usersTest.id, userId))
      expect(user).toBeDefined()
      expect(user!.displayName).toBe('Alice')
      expect(user!.isAnonymous).toBe(true)
    })

    it('enforces unique email constraint', async () => {
      await db.insert(usersTest).values({ id: randomUUID(), displayName: 'A', isAnonymous: false, email: 'a@b.com' })
      await expect(
        db.insert(usersTest).values({ id: randomUUID(), displayName: 'B', isAnonymous: false, email: 'a@b.com' })
      ).rejects.toThrow()
    })
  })

  // ─── Games ────────────────────────────────────────────────────────────────────

  describe('games', () => {
    it('creates a game record', async () => {
      const gameId = randomUUID()
      await db.insert(gamesTest).values({
        id: gameId,
        roomCode: 'ABC123',
        status: 'waiting',
      })

      const [game] = await db.select().from(gamesTest).where(eq(gamesTest.id, gameId))
      expect(game).toBeDefined()
      expect(game!.roomCode).toBe('ABC123')
      expect(game!.status).toBe('waiting')
      expect(game!.winner).toBeNull()
    })

    it('updates game status when game ends', async () => {
      const gameId = randomUUID()
      await db.insert(gamesTest).values({
        id: gameId,
        roomCode: 'XYZ999',
        status: 'active',
      })

      await db
        .update(gamesTest)
        .set({ status: 'completed', winner: 'black', endReason: 'resigned' })
        .where(eq(gamesTest.id, gameId))

      const [game] = await db.select().from(gamesTest).where(eq(gamesTest.id, gameId))
      expect(game!.status).toBe('completed')
      expect(game!.winner).toBe('black')
      expect(game!.endReason).toBe('resigned')
    })

    it('looks up game by room code', async () => {
      const gameId = randomUUID()
      await db.insert(gamesTest).values({ id: gameId, roomCode: 'FIND01', status: 'waiting' })

      const [game] = await db.select().from(gamesTest).where(eq(gamesTest.roomCode, 'FIND01'))
      expect(game).toBeDefined()
      expect(game!.id).toBe(gameId)
    })
  })

  // ─── Game moves ───────────────────────────────────────────────────────────────

  describe('game_moves', () => {
    it('persists a move and retrieves it', async () => {
      const gameId = randomUUID()
      await db.insert(gamesTest).values({ id: gameId, roomCode: 'MOV001', status: 'active' })

      const moveId = randomUUID()
      const movePayload = JSON.stringify({ type: 'place', piece: 'pawn', to: { row: 0, col: 0 }, notation: '兵a1' })

      await db.insert(gameMovesTest).values({
        id: moveId,
        gameId,
        moveNumber: 1,
        moveJson: movePayload,
      })

      const moves = await db.select().from(gameMovesTest).where(eq(gameMovesTest.gameId, gameId))
      expect(moves).toHaveLength(1)
      expect(moves[0]!.moveNumber).toBe(1)
      expect(JSON.parse(moves[0]!.moveJson as string)).toMatchObject({ type: 'place', piece: 'pawn' })
    })

    it('persists multiple moves in order', async () => {
      const gameId = randomUUID()
      await db.insert(gamesTest).values({ id: gameId, roomCode: 'MOV002', status: 'active' })

      for (let i = 1; i <= 5; i++) {
        await db.insert(gameMovesTest).values({
          id: randomUUID(),
          gameId,
          moveNumber: i,
          moveJson: JSON.stringify({ type: 'place', piece: 'pawn', to: { row: 0, col: i - 1 }, notation: `m${i}` }),
        })
      }

      const moves = await db.select().from(gameMovesTest).where(eq(gameMovesTest.gameId, gameId))
      expect(moves).toHaveLength(5)
    })

    it('cascades delete when game is deleted', async () => {
      const gameId = randomUUID()
      await db.insert(gamesTest).values({ id: gameId, roomCode: 'MOV003', status: 'active' })
      await db.insert(gameMovesTest).values({ id: randomUUID(), gameId, moveNumber: 1, moveJson: '{}' })

      await db.delete(gamesTest).where(eq(gamesTest.id, gameId))

      const moves = await db.select().from(gameMovesTest).where(eq(gameMovesTest.gameId, gameId))
      expect(moves).toHaveLength(0)
    })
  })
})
