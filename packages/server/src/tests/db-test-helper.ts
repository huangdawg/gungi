/**
 * Test database helper — uses better-sqlite3 in-memory database
 * so tests run without a live PostgreSQL instance.
 *
 * Provides the same schema structure as the production DB, but using
 * SQLite-compatible Drizzle dialect.
 */
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import {
  sqliteTable,
  text,
  integer,
  blob,
} from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

// ─── SQLite schema (mirrors Postgres schema for test purposes) ────────────────

export const usersTest = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').unique(),
  displayName: text('display_name').notNull(),
  isAnonymous: integer('is_anonymous', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  emailVerified: integer('email_verified', { mode: 'boolean' }).notNull().default(false),
  image: text('image'),
})

export const sessionsTest = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => usersTest.id),
  token: text('token').notNull().unique(),
  expiresAt: text('expires_at').notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
})

export const gamesTest = sqliteTable('games', {
  id: text('id').primaryKey(),
  roomCode: text('room_code').notNull().unique(),
  blackPlayerId: text('black_player_id'),
  whitePlayerId: text('white_player_id'),
  status: text('status').notNull().default('waiting'),
  winner: text('winner'),
  endReason: text('end_reason'),
  startedAt: text('started_at'),
  endedAt: text('ended_at'),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
})

export const gameMovesTest = sqliteTable('game_moves', {
  id: text('id').primaryKey(),
  gameId: text('game_id').notNull().references(() => gamesTest.id),
  moveNumber: integer('move_number').notNull(),
  playerId: text('player_id'),
  moveJson: text('move_json').notNull(), // stored as JSON string in SQLite
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
})

// ─── Create in-memory test database ──────────────────────────────────────────

export function createTestDb() {
  const sqlite = new Database(':memory:')

  // Enable WAL mode for better concurrency
  sqlite.pragma('journal_mode = WAL')

  // Create tables
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE,
      display_name TEXT NOT NULL,
      is_anonymous INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      email_verified INTEGER NOT NULL DEFAULT 0,
      image TEXT
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      ip_address TEXT,
      user_agent TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS games (
      id TEXT PRIMARY KEY,
      room_code TEXT NOT NULL UNIQUE,
      black_player_id TEXT,
      white_player_id TEXT,
      status TEXT NOT NULL DEFAULT 'waiting',
      winner TEXT,
      end_reason TEXT,
      started_at TEXT,
      ended_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS game_moves (
      id TEXT PRIMARY KEY,
      game_id TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
      move_number INTEGER NOT NULL,
      player_id TEXT,
      move_json TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `)

  const db = drizzle(sqlite, {
    schema: { users: usersTest, sessions: sessionsTest, games: gamesTest, gameMoves: gameMovesTest },
  })

  return { db, sqlite }
}

export type TestDb = ReturnType<typeof createTestDb>['db']
