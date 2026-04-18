import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { anonymous } from 'better-auth/plugins'
import { db } from '../db/index.js'
import * as schema from '../db/schema.js'

// ─── better-auth configuration ────────────────────────────────────────────────

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user: schema.users,
      session: schema.sessions,
      account: schema.accounts,
      verification: schema.verifications,
    },
  }),

  secret: process.env.BETTER_AUTH_SECRET ?? 'dev-secret-change-in-production',

  baseURL: process.env.BASE_URL ?? 'http://localhost:3001',

  // Email + password login for registered accounts
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },

  // Anonymous guest sessions — guests get a real user record and session token
  plugins: [
    anonymous({
      onLinkAccount: async ({ anonymousUser }) => {
        // When an anonymous user links to a registered account, the merge happens
        // automatically. We could clean up old guest display names here if desired.
        console.log(`Anonymous user ${anonymousUser.user.id} linked to registered account`)
      },
    }),
  ],

  user: {
    additionalFields: {
      displayName: {
        type: 'string',
        required: false,
        defaultValue: null,
      },
      isAnonymous: {
        type: 'boolean',
        required: false,
        defaultValue: true,
      },
    },
  },
})

export type Auth = typeof auth
