import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { randomUUID } from 'node:crypto'

const IS_PROD = (process.env.NODE_ENV ?? '').toLowerCase() === 'production'

// An unset JWT_SECRET must never reach production silently:
//   - an ephemeral (per-boot) secret logs every user out on each restart and
//     breaks multi-instance deployments (tokens issued by instance A are
//     rejected by instance B),
//   - a guessable secret hands out free token forgery.
// Dev keeps the convenient ephemeral secret, but with a loud warning.
function resolveJwtSecret() {
  const fromEnv = process.env.JWT_SECRET?.trim()
  if (fromEnv) return fromEnv
  if (IS_PROD) {
    throw new Error(
      '[auth] refusing to boot in production without JWT_SECRET. ' +
        'Generate one with: openssl rand -base64 48',
    )
  }
  console.warn(
    '[auth] JWT_SECRET is not set — using an ephemeral per-boot secret; ' +
      'every restart logs all users out. Set JWT_SECRET for anything beyond local dev.',
  )
  return randomUUID()
}

const JWT_SECRET = resolveJwtSecret()
const TOKEN_TTL = '7d'

export function authRoutes(app, data) {
  app.post('/api/register', async (req, res) => {
    const { username, password } = req.body ?? {}
    if (typeof username !== 'string' || !/^[a-zA-Z0-9_.]{3,32}$/.test(username)) {
      return res.status(400).json({ error: 'username: 3–32 chars, letters/digits/_/.' })
    }
    if (typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({ error: 'password must be at least 8 characters' })
    }
    if (data.users.byUsername.get(username)) {
      return res.status(409).json({ error: 'username already taken' })
    }
    const hash = await bcrypt.hash(password, 12)
    const info = data.users.create.run(username, hash)
    const user = data.users.byId.get(info.lastInsertRowid)
    res.status(201).json({ user, token: issueToken(user) })
  })

  app.post('/api/login', async (req, res) => {
    const { username, password } = req.body ?? {}
    const row = data.users.byUsername.get(String(username ?? ''))
    const ok = row && (await bcrypt.compare(String(password ?? ''), row.pass_hash))
    if (!ok) return res.status(401).json({ error: 'invalid username or password' })
    const user = data.users.byId.get(row.id)
    res.json({ user, token: issueToken(user) })
  })
}

export function issueToken(user) {
  return jwt.sign({ sub: user.id, username: user.username }, JWT_SECRET, {
    expiresIn: TOKEN_TTL,
  })
}

export function authMiddleware(req, res, next) {
  const header = req.headers.authorization ?? ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : req.query.token
  try {
    req.user = jwt.verify(token ?? '', JWT_SECRET)
    next()
  } catch {
    res.status(401).json({ error: 'authentication required' })
  }
}

export function verifyToken(token) {
  return jwt.verify(token ?? '', JWT_SECRET)
}
