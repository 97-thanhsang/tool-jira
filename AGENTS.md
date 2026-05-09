# Tool-Jira — AI Context Entry Point

> **Đọc file này đầu tiên khi làm việc với repo này.**
> Version: Phase 1 Complete | Cập nhật: 2026-05-10

---

## Dự án là gì?

**Tool-Jira** — Web app thay thế Jira UI cá nhân.
Kết nối tới `https://task.ascvn.com.vn` qua proxy backend.
Clone về → cấu hình `.env` → chạy ngay.

---

## Stack nhanh

```
Frontend:  Next.js 14 App Router + TypeScript + Tailwind + shadcn/ui
Backend:   Express v5 + TypeScript + Drizzle ORM + SQLite
Auth:      Basic Auth → localStorage → X-Jira-Auth header
Ports:     FE :3000 | BE :3001
Repo:      https://github.com/97-thanhsang/tool-jira
```

---

## Đọc docs theo công việc

| Bạn sẽ làm gì? | Đọc file nào |
|----------------|-------------|
| Tổng quan / bắt đầu | [`docs/project-overview.md`](./docs/project-overview.md) |
| Làm việc với `frontend/` | [`docs/frontend.md`](./docs/frontend.md) |
| Làm việc với `backend/` | [`docs/backend.md`](./docs/backend.md) |
| Hiểu auth / API flow | [`docs/data-flow.md`](./docs/data-flow.md) |
| Chọn feature tiếp theo | [`docs/roadmap.md`](./docs/roadmap.md) |
| Follow code style | [`docs/conventions.md`](./docs/conventions.md) |
| Debug / tránh lỗi cũ | [`docs/known-issues.md`](./docs/known-issues.md) |
| Tất cả docs | [`docs/AGENTS.md`](./docs/AGENTS.md) |

---

## Lệnh chạy

```powershell
# Backend (Terminal 1)
cd backend && npm run dev   # port 3001

# Frontend (Terminal 2)
cd frontend && npm run dev  # port 3000
```

---

## ⚠️ Gotchas quan trọng nhất

1. **Express v5:** Wildcard phải là `/*path`, access qua `req.params['path']` — xem `docs/known-issues.md#BUG-001`
2. **localStorage:** KHÔNG đọc trong render body — chỉ trong `useEffect` — xem `docs/known-issues.md#BUG-002`
3. **shadcn/ui:** Dự án dùng `@base-ui/react` (không phải Radix) — `delay` thay vì `delayDuration` — xem `docs/known-issues.md#GOTCHA-001`

---

## Quy tắc cập nhật docs

**AI PHẢI cập nhật docs sau mỗi thay đổi lớn:**
- Feature mới → `docs/roadmap.md` (đánh ✅) + file context liên quan
- Bug fix → `docs/known-issues.md`
- Component/hook mới → `docs/frontend.md`
- Route BE mới → `docs/backend.md`
