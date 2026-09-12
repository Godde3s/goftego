/**
 * Realtime hub over WebSockets.
 *
 * Protocol (JSON frames, both directions):
 *   client → server: {type:'join', channel} {type:'leave', channel}
 *                    {type:'typing', channel}
 *   server → client: {type:'joined', channel} {type:'presence', channel, count}
 *                    {type:'message', message} {type:'typing', channel, user}
 */

import { WebSocketServer } from 'ws'
import { verifyToken } from './auth.js'

export function attachRealtime(server, data) {
  const wss = new WebSocketServer({ server, path: '/ws' })
  /** socket -> {user, channels:Set<number>} */
  const sessions = new Map()
  /** channel -> Set<socket> */
  const rooms = new Map()

  wss.on('connection', (ws, req) => {
    let user
    try {
      const url = new URL(req.url, 'http://localhost')
      user = verifyToken(url.searchParams.get('token'))
    } catch {
      ws.close(4401, 'invalid token')
      return
    }
    sessions.set(ws, { user, channels: new Set() })

    ws.on('message', (raw) => {
      let frame
      try {
        frame = JSON.parse(raw)
      } catch {
        return
      }
      const { channel } = frame
      if (frame.type === 'join' && data.channels.byId.get(channel)) {
        sessions.get(ws).channels.add(channel)
        if (!rooms.has(channel)) rooms.set(channel, new Set())
        rooms.get(channel).add(ws)
        send(ws, { type: 'joined', channel })
        broadcast(channel, {
          type: 'presence', channel,
          count: rooms.get(channel).size,
        })
      } else if (frame.type === 'leave' && rooms.has(channel)) {
        sessions.get(ws)?.channels.delete(channel)
        rooms.get(channel).delete(ws)
        broadcast(channel, { type: 'presence', channel, count: rooms.get(channel).size })
      } else if (frame.type === 'typing' && rooms.has(channel)) {
        for (const peer of rooms.get(channel)) {
          if (peer !== ws) send(peer, { type: 'typing', channel, user: user.username })
        }
      } else if (frame.type === 'post' && data.channels.byId.get(channel)) {
        // authenticated persistence via the shared DB layer
        const body = String(frame.body ?? '').trim()
        if (!body || body.length > 4000) return
        const info = data.messages.insert.run(channel, user.sub, body)
        // persistence triggers publishMessage via the wrapped insert in index.js
        void info
      }
    })

    ws.on('close', () => {
      for (const ch of sessions.get(ws)?.channels ?? []) {
        rooms.get(ch)?.delete(ws)
        broadcast(ch, { type: 'presence', channel: ch, count: rooms.get(ch)?.size ?? 0 })
      }
      sessions.delete(ws)
    })
  })

  function send(ws, obj) {
    if (ws.readyState === 1) ws.send(JSON.stringify(obj))
  }

  function broadcast(channelId, obj) {
    for (const peer of rooms.get(channelId) ?? []) send(peer, obj)
  }

  /** Called by the REST layer after a message is persisted. */
  wss.publishMessage = (message) => broadcast(message.channel_id, { type: 'message', message })

  return wss
}
