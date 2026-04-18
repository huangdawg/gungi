import {
  pgTable,
  text,
  boolean,
  timestamp,
  integer,
  jsonb,
  index,
} from 'drizzle-orm/pg-core'

// ─── Users ────────────────────────────────────────────────────────────────────

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  email: text('email').unique(),
  displayName: text('display_name').notNull(),
  isAnonymous: boolean('is_anonymous').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),
})

// ─── Sessions (better-auth) ───────────────────────────────────────────────────

export const sessions = pgTable('sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

// ─── Accounts (better-auth) ───────────────────────────────────────────────────

export const accounts = pgTable('accounts', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at'),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
  scope: text('scope'),
  idToken: text('id_token'),
  password: text('password'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

// ─── Verifications (better-auth) ──────────────────────────────────────────────

export const verifications = pgTable('verifications', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

// ─── Games ────────────────────────────────────────────────────────────────────

export const games = pgTable(
  'games',
  {
    id: text('id').primaryKey(),
    roomCode: text('room_code').notNull().unique(),
    blackPlayerId: text('black_player_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    whitePlayerId: text('white_player_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    /** waiting | active | completed */
    status: text('status').notNull().default('waiting'),
    /** black | white | null (draw) */
    winner: text('winner'),
    /** checkmate | resigned | draw */
    endReason: text('end_reason'),
    startedAt: timestamp('started_at'),
    endedAt: timestamp('ended_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    index('games_room_code_idx').on(table.roomCode),
    index('games_black_player_idx').on(table.blackPlayerId),
    index('games_white_player_idx').on(table.whitePlayerId),
    index('games_status_idx').on(table.status),
  ]
)

// ─── Game Moves ───────────────────────────────────────────────────────────────

export const gameMoves = pgTable(
  'game_moves',
  {
    id: text('id').primaryKey(),
    gameId: text('game_id')
      .notNull()
      .references(() => games.id, { onDelete: 'cascade' }),
    moveNumber: integer('move_number').notNull(),
    playerId: text('player_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    moveJson: jsonb('move_json').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    index('game_moves_game_idx').on(table.gameId),
    index('game_moves_number_idx').on(table.gameId, table.moveNumber),
  ]
)

// ─── Type helpers ─────────────────────────────────────────────────────────────

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type Session = typeof sessions.$inferSelect
export type Game = typeof games.$inferSelect
export type NewGame = typeof games.$inferInsert
export type GameMove = typeof gameMoves.$inferSelect
export type NewGameMove = typeof gameMoves.$inferInsert
