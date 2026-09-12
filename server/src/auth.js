import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { randomUUID } from 'node:crypto'

const JWT_SECRET = process.env.JWT_SECRET || randomUUID()   // rotate in production!
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
