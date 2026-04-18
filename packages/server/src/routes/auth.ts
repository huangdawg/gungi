import { Hono } from 'hono'
import { auth } from '../auth/index.js'

const router = new Hono()

// ─── Auth routes — delegate to better-auth ───────────────────────────────────

// better-auth handles: /auth/sign-up, /auth/sign-in, /auth/sign-out,
// /auth/session, /auth/anonymous (sign in as guest)

router.all('/*', async (c) => {
  return auth.handler(c.req.raw)
})

export default router
