# Project Overview — Tool-Jira

> Context file cho AI. Đọc trước khi làm bất kỳ thay đổi nào trong dự án.
> Cập nhật lần cuối: 2026-05-10

---

## Mục tiêu

**"Jira UI tốt hơn Jira"** — ứng dụng web cá nhân thay thế Jira web interface.
- Dùng cùng tài khoản Jira hiện tại (không tạo tài khoản mới)
- Mọi thứ Jira làm được → tool này làm được, nhanh hơn và gọn hơn
- Clone source về → cấu hình `.env` → chạy ngay, không cần deploy phức tạp

---

## Tech Stack

### Frontend
| Thành phần | Công nghệ | Version |
|-----------|----------|---------|
| Framework | Next.js App Router | 14 |
| Language | TypeScript | 5 |
| Styling | Tailwind CSS | 3 |
| UI Components | shadcn/ui (base-ui/react) | latest |
| Data fetching | SWR + Axios | latest |
| Icons | lucide-react | latest |

### Backend
| Thành phần | Công nghệ | Version |
|-----------|----------|---------|
| Framework | Express | 5 (latest) |
| Language | TypeScript | 5 |
| ORM | Drizzle ORM | latest |
| Database | SQLite (local) | — |
| HTTP client | Axios | latest |

---

## Kiến trúc tổng quan

```
Browser (Next.js :3000)
    │
    │ axios (X-Jira-Auth header)
    ▼
Backend (Express :3001)
    │
    │ axios (Authorization: Basic ...)
    ▼
Jira REST API v2
(https://task.ascvn.com.vn)
```

**Tại sao có backend proxy?**
- CORS: Jira không cho browser gọi trực tiếp từ localhost
- Bảo mật: credentials không lộ trong network tab của browser
- Extensibility: backend có thể cache, transform, thêm business logic sau

---

## Cấu trúc thư mục

```
E:\SOURCE\jira\
├── backend/
│   ├── src/
│   │   ├── index.ts          # Express entry point
│   │   ├── config.ts         # Env vars
│   │   ├── db/
│   │   │   ├── index.ts      # SQLite init + auto-migrate
│   │   │   └── schema.ts     # Drizzle schema (user_settings, bookmarks)
│   │   └── routes/
│   │       └── jira.ts       # Proxy route: /api/jira/* → Jira REST API
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/
│   ├── app/
│   │   ├── layout.tsx        # Root layout (fonts, metadata)
│   │   ├── page.tsx          # / → redirect board hoặc login
│   │   ├── (auth)/login/     # Login page
│   │   └── (app)/            # Protected routes (layout check auth)
│   │       ├── layout.tsx    # Auth guard + Sidebar
│   │       ├── board/        # My Board (Kanban)
│   │       └── issues/[key]/ # Issue Detail
│   ├── components/
│   │   ├── ui/               # shadcn/ui primitives
│   │   ├── shared/           # StatusBadge, PriorityIcon
│   │   ├── board/            # IssueCard, KanbanBoard
│   │   ├── issue/            # WikiRenderer, TransitionButton
│   │   └── sidebar.tsx       # Navigation sidebar
│   ├── hooks/
│   │   ├── use-my-issues.ts  # SWR hook: my assigned issues
│   │   └── use-issue.ts      # SWR hook: single issue detail
│   ├── lib/
│   │   ├── api.ts            # Axios instance + auth helpers
│   │   ├── jira-wiki.ts      # Jira wiki markup → HTML parser
│   │   └── utils.ts          # cn() helper
│   └── types/
│       └── jira.ts           # TypeScript interfaces cho Jira API
│
├── docs/                     # AI context files (luôn cập nhật)
├── AGENTS.md                 # Entry point cho AI (đọc đầu tiên)
└── PLAN.md                   # Implementation plan gốc
```

---

## Environment Variables

### Backend (`backend/.env`)
```
PORT=3001
JIRA_BASE_URL=https://task.ascvn.com.vn
```

### Frontend (`frontend/.env.local`)
```
NEXT_PUBLIC_API_URL=http://localhost:3001
```

---

## Cách chạy project

```powershell
# Terminal 1 — Backend
cd E:\SOURCE\jira\backend
npm run dev        # ts-node-dev, port 3001

# Terminal 2 — Frontend
cd E:\SOURCE\jira\frontend
npm run dev        # Next.js dev, port 3000
```

---

## Jira API Version

Dự án dùng **Jira REST API v2** (`/rest/api/2/`).
Base URL: `https://task.ascvn.com.vn`

Các endpoint quan trọng:
- `GET /rest/api/2/myself` — verify credentials
- `GET /rest/api/2/search?jql=...` — search issues
- `GET /rest/api/2/issue/{key}` — issue detail
- `GET /rest/api/2/issue/{key}/transitions` — available transitions
- `POST /rest/api/2/issue/{key}/transitions` — execute transition
- `POST /rest/api/2/issue/{key}/worklog` — log work
- `POST /rest/api/2/issue/{key}/comment` — add comment

---

## Trạng thái hiện tại (Phase 1 — DONE)

- ✅ Login page với Basic Auth
- ✅ My Board — Kanban 3 cột (To Do / In Progress / Done)
- ✅ Issue Detail — wiki markup, transitions, metadata sidebar
- ✅ Backend proxy Express v5 + SQLite/Drizzle
- ✅ Push lên GitHub: https://github.com/97-thanhsang/tool-jira
- ✅ Hydration bug fix (Sidebar localStorage → useEffect)
