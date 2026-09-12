import Database from 'better-sqlite3'

/**
 * Database layer. Pass ':memory:' in tests, a file path in production.
 */
export function createDb(path = process.env.DB_PATH || 'goftego.db') {
  const db = new Database(path)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      username    TEXT UNIQUE NOT NULL,
      pass_hash   TEXT NOT NULL,
      created_at  INTEGER NOT NULL DEFAULT (unixepoch())
    );
    CREATE TABLE IF NOT EXISTS channels (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      slug        TEXT UNIQUE NOT NULL,
      name        TEXT NOT NULL,
      topic       TEXT DEFAULT '',
      created_by  INTEGER REFERENCES users(id),
      created_at  INTEGER NOT NULL DEFAULT (unixepoch())
    );
    CREATE TABLE IF NOT EXISTS messages (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      channel_id  INTEGER NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
      user_id     INTEGER NOT NULL REFERENCES users(id),
      body        TEXT NOT NULL,
      created_at  INTEGER NOT NULL DEFAULT (unixepoch())
    );
    CREATE INDEX IF NOT EXISTS idx_messages_channel
      ON messages(channel_id, id DESC);
  `)

  // default channels on first boot
  const count = db.prepare('SELECT COUNT(*) AS n FROM channels').get().n
  if (count === 0) {
    const seed = db.prepare('INSERT INTO channels (slug, name, topic) VALUES (?, ?, ?)')
    seed.run('general', 'General', 'گفتگوی آزاد — free talk')
    seed.run('random', 'Random', 'هر چیزی که فکرش را می‌کنید')
  }

  return {
    db,
    users: {
      create: db.prepare('INSERT INTO users (username, pass_hash) VALUES (?, ?)'),
      byUsername: db.prepare('SELECT * FROM users WHERE username = ?'),
      byId: db.prepare('SELECT id, username, created_at FROM users WHERE id = ?'),
    },
    channels: {
      all: db.prepare('SELECT * FROM channels ORDER BY id'),
      bySlug: db.prepare('SELECT * FROM channels WHERE slug = ?'),
      byId: db.prepare('SELECT * FROM channels WHERE id = ?'),
      create: db.prepare('INSERT INTO channels (slug, name, topic, created_by) VALUES (?, ?, ?, ?)'),
    },
    messages: {
      page: db.prepare(`
        SELECT m.id, m.channel_id, m.body, m.created_at,
               u.id AS user_id, u.username
        FROM messages m JOIN users u ON u.id = m.user_id
        WHERE m.channel_id = ? AND m.id < ?
        ORDER BY m.id DESC LIMIT ?`),
      insert: db.prepare(
        'INSERT INTO messages (channel_id, user_id, body) VALUES (?, ?, ?)'),
      byId: db.prepare(`
        SELECT m.id, m.channel_id, m.body, m.created_at,
               u.id AS user_id, u.username
        FROM messages m JOIN users u ON u.id = m.user_id
        WHERE m.id = ?`),
    },
  }
}
