import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import request from 'supertest'
import { createDb } from '../src/db.js'
import { authRoutes, authMiddleware } from '../src/auth.js'
import { channelRoutes } from '../src/channels.js'
import express from 'express'

function buildApp() {
  const app = express()
  app.use(express.json())
  const data = createDb(':memory:')
  authRoutes(app, data)
  app.use('/api', authMiddleware)
  channelRoutes(app, data)
  return { app, data }
}

let app, tokenA, tokenB

beforeAll(async () => {
  ({ app } = buildApp())
  const regA = await request(app).post('/api/register')
    .send({ username: 'reza', password: 'super-secret-1' })
  expect(regA.status).toBe(201)
  tokenA = regA.body.token

  const regB = await request(app).post('/api/register')
    .send({ username: 'sara', password: 'another-secret' })
  tokenB = regB.body.token
})

afterAll(() => {})

describe('auth', () => {
  it('rejects weak passwords and duplicate usernames', async () => {
    const weak = await request(app).post('/api/register')
      .send({ username: 'ali', password: '123' })
    expect(weak.status).toBe(400)

    const dup = await request(app).post('/api/register')
      .send({ username: 'reza', password: 'whatever-long' })
    expect(dup.status).toBe(409)
  })

  it('logs in and rejects wrong passwords', async () => {
    const ok = await request(app).post('/api/login')
      .send({ username: 'reza', password: 'super-secret-1' })
    expect(ok.status).toBe(200)
    expect(ok.body.user.username).toBe('reza')

    const bad = await request(app).post('/api/login')
      .send({ username: 'reza', password: 'wrong-password' })
    expect(bad.status).toBe(401)
  })

  it('blocks unauthenticated API access', async () => {
    const res = await request(app).get('/api/channels')
    expect(res.status).toBe(401)
  })
})

describe('channels + messages', () => {
  let channelId

  it('seeds default channels', async () => {
    const res = await request(app).get('/api/channels')
      .set('Authorization', `Bearer ${tokenA}`)
    expect(res.status).toBe(200)
    expect(res.body.channels.map(c => c.slug)).toContain('general')
    channelId = res.body.channels[0].id
  })

  it('creates a channel with slug generation', async () => {
    const res = await request(app).post('/api/channels')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ name: 'Design Team', topic: 'طراحی' })
    expect(res.status).toBe(201)
    expect(res.body.channel.slug).toBe('design-team')
  })

  it('posts and lists messages in order', async () => {
    await request(app).post(`/api/channels/${channelId}/messages`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ body: 'سلام از رضا — hello from Reza' })
    await request(app).post(`/api/channels/${channelId}/messages`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ body: 'Salam Sara inja ast!' })

    const res = await request(app).get(`/api/channels/${channelId}/messages`)
      .set('Authorization', `Bearer ${tokenA}`)
    expect(res.status).toBe(200)
    const bodies = res.body.messages.map(m => m.body)
    expect(bodies[0]).toBe('سلام از رضا — hello from Reza')
    expect(bodies[1]).toBe('Salam Sara inja ast!')
    expect(res.body.messages[0].username).toBe('reza')
  })

  it('rejects empty and oversized messages', async () => {
    const empty = await request(app).post(`/api/channels/${channelId}/messages`)
      .set('Authorization', `Bearer ${tokenA}`).send({ body: '   ' })
    expect(empty.status).toBe(400)

    const big = await request(app).post(`/api/channels/${channelId}/messages`)
      .set('Authorization', `Bearer ${tokenA}`).send({ body: 'x'.repeat(4001) })
    expect(big.status).toBe(400)
  })
})
