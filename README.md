# Goftego — پلتفرم چت سلف‌هاست

**Goftego** (گفتگو — "conversation") is a lightweight, self-hosted chat
platform: channels, direct realtime messaging, JWT auth, bcrypt-hashed
passwords, live presence and typing indicators — in **one SQLite file**,
with a Vue 3 SPA and zero external services.

English docs below · مستندات فارسی پایین صفحه

---

## English

### Why

Hosted chat SaaS locks your community behind someone else's storage,
pricing and jurisdiction. Goftego is the answer for small teams and
communities that want a **one-command, own-your-data** chat room that
still feels modern: realtime, keyboard-friendly, dark by default,
bilingual (fa/en) with proper RTL.

### Features

- 💬 **Channels** — create, browse, paginated history (50/page)
- ⚡ **Realtime** — WebSocket fan-out, presence counts, typing indicators
- 🔐 **Auth** — register/login with bcrypt (cost 12) + JWT (7-day tokens)
- 🗄 **SQLite storage** — one file, WAL mode, zero external dependencies
- 🌍 **Bilingual UI** — Persian (RTL) and English, switchable in one click
- 🐳 **Docker** — `docker compose up` and you are live

### Quick start (development)

```bash
# terminal 1 — API + realtime server
cd server && npm install && npm run dev        # http://localhost:3000

# terminal 2 — Vue client with HMR + proxy
cd client && npm install && npm run dev        # http://localhost:5173
```

### Production (single origin)

```bash
cd client && npm run build                     # emits client/dist
cd ../server && npm start                      # serves API + static SPA on :3000
```

### Docker

```bash
docker compose up --build                      # → http://localhost:3000
```

### Architecture

```
┌──────────────────────────── server (Node, ESM) ─────────────────────────┐
│  Express REST                WS hub (/ws)             better-sqlite3    │
│  /api/register /login        join / leave / typing    users             │
│  /api/channels (+messages)   post → persist → fan-out channels          │
│  JWT middleware              presence counts          messages (WAL)    │
└──────────────────────────────────┬───────────────────────────────────────┘
                                   │  same JWT
┌────────────────────── client (Vue 3 + Vite SPA) ────────────┐
│  LoginView ─ ChatView: sidebar + message list + composer    │
│  store.js: reactive store, i18n fa/en, RTL toggle           │
└────────────────────────────────────────────────────────────────┘
```

### Security posture

- Passwords: bcrypt with cost 12 — never stored, logged or returned
- Sessions: signed JWTs; the WS handshake re-verifies the token
- Input: username charset enforcement, message length caps (4,000),
  JSON body limit 256 KB
- Secrets: `JWT_SECRET` env var (auto-generated per boot if unset — set
  it in production!)

### Testing

```bash
cd server && npm test        # vitest: auth flow, channel CRUD, message paging
```

### Roadmap

- [ ] File attachments (local disk + S3 adapter)
- [ ] Direct messages (1:1 rooms)
- [ ] Web push notifications
- [ ] Message reactions & edit/delete

---

## فارسی

**گفتگو** یک پلتفرم چت سبک و سلف‌هاست است: کانال‌ها، پیام‌رسانی زنده با
وب‌سوکت، ورود با JWT و گذرواژه‌ی هش‌شده با bcrypt، حضور آنلاین و نشانگر
«در حال نوشتن» — همه در **یک فایل SQLite**، بدون هیچ سرویس خارجی.

اجرا: `docker compose up` یا دو ترمینال مطابق دستورهای بخش انگلیسی.
رابط کاربری فارسی و راست‌به‌چپ به‌صورت پیش‌فرض است و با یک کلیک انگلیسی می‌شود.

## License

MIT © Reza Bazdar (Godde3s)
