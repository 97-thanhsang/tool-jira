# Backend Context — Tool-Jira

> Đọc file này khi làm việc với `backend/` folder.
> Cập nhật lần cuối: 2026-05-10

---

## Tổng quan

Express v5 server, chạy port `3001`. Vai trò chính là **reverse proxy** — nhận request từ frontend, gắn Basic Auth header, forward sang Jira REST API v2.

---

## ⚠️ Express v5 Breaking Changes (BẮT BUỘC PHẢI BIẾT)

Express v5 dùng `path-to-regexp` v8, có breaking changes quan trọng:

```typescript
// ❌ WRONG — Express v4 syntax, KHÔNG dùng trong v5
router.all('/*', handler)
req.params[0]  // undefined trong v5

// ✅ CORRECT — Express v5 syntax
router.all('/*path', handler)
req.params['path']  // đúng
```

Xem chi tiết: `docs/known-issues.md`

---

## Cấu trúc files

```
backend/src/
├── index.ts        # Entry point — Express app setup
├── config.ts       # Env vars (PORT, JIRA_BASE_URL)
├── db/
│   ├── index.ts    # SQLite init, tạo bảng nếu chưa có
│   └── schema.ts   # Drizzle schema definitions
└── routes/
    └── jira.ts     # Proxy route handler
```

---

## `index.ts` — App setup

```typescript
// Port: config.port (default 3001)
// CORS: chỉ cho phép http://localhost:3000
// Routes:
//   GET  /health       → { status: 'ok' }
//   ALL  /api/jira/*   → jiraRouter (proxy)
```

**Khi thêm route mới:** import và `app.use('/api/xxx', xxxRouter)` trong `index.ts`.

---

## `routes/jira.ts` — Proxy pattern

Mọi request từ FE đến `/api/jira/{path}` được forward sang Jira:

```
FE: GET /api/jira/search?jql=...
    Header: X-Jira-Auth: <base64>

BE: GET https://task.ascvn.com.vn/rest/api/2/search?jql=...
    Header: Authorization: Basic <base64>
```

**Header mapping:**
- FE gửi: `X-Jira-Auth: <base64 của username:password>`
- BE forward: `Authorization: Basic <base64>`

**Query params:** được forward nguyên xi (`params: req.query`)
**Body:** được forward cho non-GET requests (`data: req.body`)

---

## `db/schema.ts` — Database Schema

```typescript
// Bảng 1: user_settings
// Dùng để lưu preferences (key-value store)
// key: string (unique), value: string (JSON serialized)
userSettings: { id, key, value, updatedAt }

// Bảng 2: bookmarks
// Lưu issues đã bookmark để truy cập nhanh
bookmarks: { id, issueKey (unique), summary, projectKey, createdAt }
```

**Migration:** Auto-migrate khi start (`db/index.ts` chạy `CREATE TABLE IF NOT EXISTS`).

**Tương lai:** Migrate sang PostgreSQL — Drizzle ORM hỗ trợ cả hai, chỉ cần đổi connection string.

---

## Thêm route mới

Khi Phase 2+ cần endpoint mới (ví dụ: `/api/local/settings`):

```typescript
// 1. Tạo file: backend/src/routes/settings.ts
import { Router } from 'express';
const router = Router();
router.get('/', async (req, res) => { /* ... */ });
export default router;

// 2. Register trong index.ts
import settingsRouter from './routes/settings';
app.use('/api/local/settings', settingsRouter);
```

---

## Scripts

```powershell
# Dev (hot reload với ts-node-dev)
npm run dev

# Build
npm run build

# Start (production)
npm start
```

---

## Environment Variables

File: `backend/.env` (gitignored)

```
PORT=3001
JIRA_BASE_URL=https://task.ascvn.com.vn
```

Nếu cần thêm env var mới: thêm vào `config.ts` trước.
