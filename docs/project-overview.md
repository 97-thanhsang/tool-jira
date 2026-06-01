# Project Overview — Jira Power

> Luôn đọc file này trước khi làm bất kỳ thay đổi nào.
> Cập nhật lần cuối: 2026-05-29

---

## Mục tiêu

**"Jira UI tốt hơn Jira"** — ứng dụng web cá nhân thay thế Jira web interface chính thức.
- Dùng cùng tài khoản Jira hiện tại, không cần tạo tài khoản mới
- Nhanh hơn, gọn hơn, có AI hỗ trợ
- Clone về → cấu hình `.env` → chạy ngay, không cần deploy phức tạp

---

## Tech Stack

### Frontend (`frontend/` — port 3000)

| Thành phần | Công nghệ | Ghi chú |
|-----------|----------|---------|
| Framework | **Next.js 16** App Router | Toàn bộ là Client Components (`'use client'`) |
| Language | TypeScript 5 | Strict mode |
| Styling | **Tailwind CSS v4** | Không có `tailwind.config.ts`; dark mode via `@custom-variant` |
| UI Components | **@base-ui/react** | KHÔNG phải Radix UI — xem `known-issues.md` GOTCHA-001 |
| Data fetching | SWR + Axios | SWR = server state; useState = UI state |
| Icons | lucide-react | |
| Charts | recharts | Dùng trong team dashboard |
| Drag & Drop | @dnd-kit/core | Kanban board + worklog calendar |
| Runtime | React 19 | |

### Backend (`backend/` — port 3001)

| Thành phần | Công nghệ | Ghi chú |
|-----------|----------|---------|
| Framework | **Express v5** | Breaking changes — xem `known-issues.md` BUG-001, BUG-004 |
| Language | TypeScript 6 | |
| ORM | Drizzle ORM | Dual support SQLite / PostgreSQL |
| Database | SQLite (mặc định) | Auto-migrate khi start |
| Database | PostgreSQL 16 | Khi set `DATABASE_URL` env var |
| HTTP client | Axios | Proxy requests tới Jira |
| AI | Google Gemini 2.5 Flash | `@google/generative-ai` package |

---

## Kiến trúc tổng quan

```
Browser (Next.js :3000)
    │
    │  axios  ──  X-Jira-Auth: <base64>
    ▼
Backend (Express :3001)
    │
    ├─ /api/jira/*  ──  Authorization: Basic <base64>  ──▶  Jira REST API v2
    │                                                         https://task.ascvn.com.vn
    │
    └─ /api/ai/*    ──  X-AI-Key: <gemini_key>         ──▶  Google Gemini 2.5 Flash
```

**Tại sao có backend proxy?**
- CORS: Jira block direct call từ browser (localhost)
- Bảo mật: credentials không lộ trong Network tab của browser
- AI key: Google API key không lộ ra client

---

## Cấu trúc thư mục

```
E:\SOURCE\jira\
├── frontend/
│   ├── app/
│   │   ├── layout.tsx                    # Root layout (fonts, dark-mode inline script)
│   │   ├── page.tsx                      # / → redirect board hoặc login
│   │   ├── (auth)/login/page.tsx         # Login (unprotected)
│   │   └── (app)/                        # Protected (auth guard in layout)
│   │       ├── layout.tsx                # Auth guard + Sidebar + global shortcuts + modals
│   │       ├── board/page.tsx            # My Board — Kanban drag-drop
│   │       ├── issues/page.tsx           # My Issues — table + filters + bulk actions
│   │       ├── issues/[key]/page.tsx     # Issue Detail — wiki, comments, attachments
│   │       ├── projects/page.tsx         # Projects browser
│   │       ├── projects/[key]/page.tsx   # Project board
│   │       ├── search/page.tsx           # JQL Search
│   │       ├── team/page.tsx             # Team Dashboard — worklogs + metrics
│   │       ├── team-plan/page.tsx        # Team Workload Planner
│   │       ├── worklog/page.tsx          # Worklog Calendar
│   │       └── settings/page.tsx        # Settings — API keys, theme
│   ├── components/                       # Xem docs/frontend.md — Component Map
│   ├── hooks/                            # 13 SWR-based hooks
│   ├── lib/                              # API client, domain APIs, utilities
│   └── types/jira.ts                    # Tất cả TypeScript types
│
├── backend/
│   └── src/
│       ├── index.ts                      # Express app setup, CORS, route registration
│       ├── config.ts                     # Env vars (PORT, JIRA_BASE_URL)
│       ├── routes/
│       │   ├── jira.ts                   # Proxy: /api/jira/* → Jira REST API v2
│       │   └── ai.ts                     # AI: /api/ai/* → Google Gemini 2.5 Flash
│       └── db/
│           ├── index.ts                  # Auto-detect SQLite vs PostgreSQL, init tables
│           ├── schema.ts                 # Drizzle schema (SQLite)
│           └── schema-pg.ts             # Drizzle schema (PostgreSQL)
│
├── docs/                                 # Context files — cập nhật sau mỗi thay đổi
├── docker-compose.yml                    # postgres:16 + backend:3001 + frontend:3000
├── AGENTS.md                            # AI entry point
└── CLAUDE.md                            # Claude Code guidance
```

---

## Environment Variables

### Backend (`backend/.env`)
```
PORT=3001
JIRA_BASE_URL=https://task.ascvn.com.vn
# DATABASE_URL=postgresql://user:pass@localhost:5432/jira  ← bỏ comment để dùng PG
```

### Frontend (`frontend/.env.local`)
```
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### Docker (`/.env` root)
```
POSTGRES_USER=jira
POSTGRES_PASSWORD=jira_password
POSTGRES_DB=jira_power
JIRA_BASE_URL=https://task.ascvn.com.vn
```

---

## Chạy project

```powershell
# Local dev (2 terminal)
cd backend  && npm run dev   # port 3001, hot reload
cd frontend && npm run dev   # port 3000, Next.js dev

# Docker full stack
docker-compose up --build    # lần đầu
docker-compose up            # lần sau
```

---

## Trạng thái hiện tại

| Phase | Tên | Status |
|-------|-----|--------|
| 1 | MVP (Backend proxy, Login, Board, Issue Detail) | ✅ Done |
| 2 | Core Workflow (My Issues, Log Work, Comments, Transitions, Create Issue, Search) | ✅ Done |
| 3 | Power Features (Projects, JQL, Keyboard Shortcuts, Bulk Actions, Worklog History, Settings, Dark Mode, Notifications) | ✅ Done |
| 4 | AI Integration (Gemini — Summarize, Draft Comment, Parse Worklog, Suggest Transition, Sprint Review) | ✅ Done |
| 5 | Production Ready (Docker, PostgreSQL, README, Rate Limiting, Error Boundary) | 🔄 Partial (Docker ✅) |

Xem chi tiết: `docs/roadmap.md`
