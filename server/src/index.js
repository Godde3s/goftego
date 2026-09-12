import express from 'express'
import { existsSync } from 'node:fs'
import { createDb } from './db.js'
import { authMiddleware, authRoutes } from './auth.js'
import { channelRoutes } from './channels.js'
import { attachRealtime } from './realtime.js'

const PORT = Number(process.env.PORT) || 3000

const app = express()
const data = createDb()

app.use(express.json({ limit: '256kb' }))

// ---- public -----------------------------------------------------------
app.get('/api/health', (_req, res) => res.json({ ok: true, name: 'goftego' }))
authRoutes(app, data)

// ---- authenticated -----------------------------------------------------
app.use('/api', authMiddleware)
channelRoutes(app, data)
app.get('/api/me', (req, res) => res.json({ user: req.user }))

// ---- realtime -----------------------------------------------------------
const server = app.listen(PORT, () => {
  console.log(`Goftego listening on http://localhost:${PORT}`)
})
const wss = attachRealtime(server, data)

/** REST-created messages are fanned out to WS subscribers. */
const originalInsert = data.messages.insert
data.messages.insert = (...args) => {
  const info = originalInsert.run(...args)
  wss.publishMessage(data.messages.byId.get(info.lastInsertRowid))
  return info
}

// ---- SPA (built client) --------------------------------------------------
const dist = new URL('../client/dist', import.meta.url).pathname
if (existsSync(dist)) {
  app.use(express.static(dist))
  app.get(/^\/(?!api|ws).*/, (_req, res) => res.sendFile(`${dist}/index.html`))
} else {
  app.get('/', (_req, res) =>
    res.send('Goftego API is running — build the client: cd client && npm run build'))
}

export { app, server, data }
