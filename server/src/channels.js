/** REST routes for channels and messages (all behind authMiddleware). */

const PAGE_SIZE = 50

export function channelRoutes(app, data) {
  app.get('/api/channels', (req, res) => {
    res.json({ channels: data.channels.all.all() })
  })

  app.post('/api/channels', (req, res) => {
    const name = String(req.body?.name ?? '').trim()
    if (name.length < 2 || name.length > 40) {
      return res.status(400).json({ error: 'channel name must be 2–40 chars' })
    }
    const slug = name.toLowerCase().replace(/[^a-z0-9\u0600-\u06FF]+/g, '-')
      .replace(/^-+|-+$/g, '') || `ch-${Date.now()}`
    if (data.channels.bySlug.get(slug)) {
      return res.status(409).json({ error: 'channel already exists' })
    }
    const info = data.channels.create.run(slug, name, req.body?.topic ?? '', req.user.sub)
    res.status(201).json({ channel: data.channels.byId.get(info.lastInsertRowid) })
  })

  app.get('/api/channels/:id/messages', (req, res) => {
    const channelId = Number(req.params.id)
    if (!data.channels.byId.get(channelId)) {
      return res.status(404).json({ error: 'channel not found' })
    }
    const before = Number(req.query.before) || Number.MAX_SAFE_INTEGER
    const limit = Math.min(Number(req.query.limit) || PAGE_SIZE, 100)
    const rows = data.messages.page.all(channelId, before, limit)
    res.json({ messages: rows.reverse() })       // oldest → newest
  })

  app.post('/api/channels/:id/messages', (req, res) => {
    const channelId = Number(req.params.id)
    const body = String(req.body?.body ?? '').trim()
    if (!body) return res.status(400).json({ error: 'message body required' })
    if (body.length > 4000) return res.status(400).json({ error: 'message too long (4000 max)' })
    if (!data.channels.byId.get(channelId)) {
      return res.status(404).json({ error: 'channel not found' })
    }
    const info = data.messages.insert.run(channelId, req.user.sub, body)
    res.status(201).json({ message: data.messages.byId.get(info.lastInsertRowid) })
  })
}
