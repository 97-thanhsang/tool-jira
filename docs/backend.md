# Backend — Jira Power

> Đọc file này khi làm việc với `backend/` folder.
> Cập nhật lần cuối: 2026-05-29

---

## Tổng quan

Express v5 server, port `3001`. Vai trò chính:
1. **Reverse proxy** — nhận request từ FE, gắn Basic Auth header, forward sang Jira REST API v2
2. **AI proxy** — nhận AI request, gắn Gemini API key, gọi Google Gemini 2.5 Flash
3. **Local DB** — lưu `user_settings` và `bookmarks` vào SQLite (hoặc PostgreSQL)

---

## ⚠️ Express v5 — BẮT BUỘC PHẢI BIẾT

Express v5 dùng `path-to-regexp` v8 với breaking changes:

```typescript
// ❌ Express v4 syntax — KHÔNG dùng
router.all('/*', handler)
req.params[0]  // undefined trong v5

// ✅ Express v5 syntax — ĐÚNG
router.all('/*path', handler)
const rawPath = req.params['path'];
const jiraPath = Array.isArray(rawPath) ? rawPath.join('/') : (rawPath ?? '');
// Lưu ý: nested path VD /issue/KEY/transitions → params['path'] là ARRAY, không phải string
```

Chi tiết: `docs/known-issues.md` → BUG-001, BUG-004

---

## File Structure

```
backend/src/
├── index.ts          # Express app setup, CORS whitelist, route registration
├── config.ts         # Env vars: PORT (3001), JIRA_BASE_URL
├── routes/
│   ├── jira.ts       # 6 route handlers — Jira proxy
│   └── ai.ts         # 5 route handlers — Gemini AI proxy
└── db/
    ├── index.ts      # DB init: auto-detect SQLite vs PG, create tables
    ├── schema.ts     # Drizzle schema (SQLite — default local dev)
    └── schema-pg.ts  # Drizzle schema (PostgreSQL — khi DATABASE_URL set)
```

---

## `index.ts` — App Setup

```typescript
// CORS whitelist: http://localhost:3000, https://tool-jira*.vercel.app
// Routes:
app.get('/health')             // → { status: 'ok' }
app.use('/api/jira', jiraRouter)
app.use('/api/ai', aiRouter)
```

**Thêm route mới:**
```typescript
// 1. Tạo: backend/src/routes/xxx.ts
import { Router } from 'express';
const router = Router();
router.get('/', async (req, res) => { return res.json({ data }); });
export default router;

// 2. Register trong index.ts
import xxxRouter from './routes/xxx';
app.use('/api/xxx', xxxRouter);
```

---

## `routes/jira.ts` — Jira Proxy

**Header mapping:**
- FE gửi: `X-Jira-Auth: <base64 của username:password>`
- BE forward: `Authorization: Basic <base64>`

**6 handlers:**

| Method | Path | Mô tả |
|--------|------|-------|
| `GET` | `/api/jira/avatar` | Proxy avatar URL (query param `?url=...`), xử lý redirect |
| `GET` | `/api/jira/attachment-content/:id` | Download file/image đính kèm |
| `GET` | `/api/jira/attachment-thumbnail/:id` | Thumbnail ảnh, fallback về full content |
| `ALL` | `/api/jira/agile/*path` | Proxy tới `/rest/agile/1.0/*` — boards, sprints |
| `ALL` | `/api/jira/*path` | Proxy tất cả Jira REST API v2 (main handler) |

**Main proxy pattern:**
```
FE: GET /api/jira/search?jql=...   (Header: X-Jira-Auth: <base64>)
BE: GET https://task.ascvn.com.vn/rest/api/2/search?jql=...  (Header: Authorization: Basic <base64>)
```
- Query params: forward nguyên xi
- Body: forward cho non-GET requests
- Response: trả về nguyên xi (status code + body)

---

## `routes/ai.ts` — Gemini AI Proxy

**Auth:** Đọc `X-AI-Key` header — nếu thiếu → 401. Key KHÔNG lưu trên server.  
**Model:** `gemini-2.5-flash`  
**Package:** `@google/generative-ai`  
**Ngôn ngữ:** Respond theo ngôn ngữ input (EN/VI)

| Method | Path | Request Body | Response |
|--------|------|-------------|----------|
| `POST` | `/api/ai/summarize` | `{ issueKey, summary, description, comments[] }` | `{ bullets: string[] }` |
| `POST` | `/api/ai/draft-comment` | `{ issueKey, summary, intent }` | `{ draft: string }` |
| `POST` | `/api/ai/parse-worklog` | `{ input: string }` | `{ timeSpent: string, comment: string }` |
| `POST` | `/api/ai/suggest-transition` | `{ issueKey, summary, description, currentStatus, comments[] }` | `{ suggestion: string, reason: string }` |
| `POST` | `/api/ai/sprint-review` | `{ worklogs: WorklogItem[] }` | `{ markdown: string }` |

**Lưu ý:** Gemini đôi khi trả JSON wrapped trong ` ```json ``` ` — backend tự strip trước khi parse.

---

## `db/index.ts` — Database

**Auto-detect runtime:**
- Nếu `DATABASE_URL` env không set → dùng SQLite (`data/jira-power.db`)
- Nếu `DATABASE_URL` set → dùng PostgreSQL (Drizzle + `pg` pool)

**SQLite mode:** `CREATE TABLE IF NOT EXISTS` tự động khi start  
**PG mode:** Drizzle migrations

---

## Database Schema

Schema được định nghĩa 2 lần — **phải cập nhật cả hai khi thay đổi:**
- `db/schema.ts` — SQLite (mặc định local dev)
- `db/schema-pg.ts` — PostgreSQL (Docker / production)

### `user_settings`
```typescript
{ id, key: string (UNIQUE), value: string, updatedAt: timestamp }
// Dùng làm key-value store cho preferences
// Ví dụ: theme, notification settings
```

### `bookmarks`
```typescript
{ id, issueKey: string (UNIQUE), summary: string, projectKey: string, createdAt: timestamp }
// Lưu issues đã bookmark để truy cập nhanh
```

---

## Environment Variables

File: `backend/.env` (gitignored) — xem `backend/.env.example`

```
PORT=3001
JIRA_BASE_URL=https://task.ascvn.com.vn
# DATABASE_URL=postgresql://user:password@localhost:5432/jira_power
```

---

## Scripts

```powershell
npm run dev     # ts-node-dev --respawn (hot reload)
npm run build   # tsc → dist/
npm start       # node dist/index.js (production)
```
