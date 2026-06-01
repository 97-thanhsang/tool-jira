# Jira Power — AI Context Index

> Đọc file này **trước tiên**. Sau đó đọc đúng context file cho phần sẽ làm việc.
> Cập nhật lần cuối: 2026-05-29

---

## ⚡ Quick Context

```
Project:  Jira Power — Personal Jira UI replacement
Stack:    Next.js 16 (App Router) + Express v5 + Drizzle ORM (SQLite/PG)
          @base-ui/react + SWR + Tailwind v4 + React 19
Auth:     Basic Auth → base64 → X-Jira-Auth header
Jira:     https://task.ascvn.com.vn (REST API v2)
Repo:     https://github.com/97-thanhsang/tool-jira
Root:     E:\SOURCE\jira\
BE port:  3001  |  FE port: 3000
Status:   Phase 1–4 ✅ Done  |  Phase 5 (Production) 🔄 Partial
```

---

## 🗂️ Cấu trúc docs

| File | Khi nào đọc |
|------|-------------|
| [`project-overview.md`](./project-overview.md) | Luôn đọc — kiến trúc tổng quan, tech stack, môi trường |
| [`backend.md`](./backend.md) | Làm việc với `backend/` — routes, proxy, DB, AI endpoints |
| [`frontend.md`](./frontend.md) | Làm việc với `frontend/` — pages, components, hooks, lib |
| [`data-flow.md`](./data-flow.md) | Hiểu auth flow, API call chain, localStorage keys |
| [`conventions.md`](./conventions.md) | Coding conventions, naming rules, anti-patterns |
| [`known-issues.md`](./known-issues.md) | Bugs đã fix, gotchas quan trọng — ĐỌC TRƯỚC khi debug |
| [`roadmap.md`](./roadmap.md) | Trạng thái feature, changelog, kế hoạch tiếp theo |

---

## 🔄 Quy tắc cập nhật docs

**Sau mỗi thay đổi đáng kể, cập nhật ngay:**

| Thay đổi | File cần cập nhật |
|---------|-------------------|
| Thêm page / route | `frontend.md` — Route Structure |
| Thêm component | `frontend.md` — Component Map |
| Thêm hook | `frontend.md` — Hooks |
| Thêm lib utility | `frontend.md` — Lib |
| Thêm/sửa type | `frontend.md` — Types |
| Thêm BE route | `backend.md` |
| Thay đổi auth / data flow | `data-flow.md` |
| Fix bug quan trọng | `known-issues.md` |
| Feature hoàn thành | `roadmap.md` — đánh ✅ + Changelog |
| Convention mới | `conventions.md` |

---

## 📋 Checklist trước khi implement

- [ ] Đã đọc `project-overview.md` chưa?
- [ ] Đã đọc context file cho phần sẽ làm?
- [ ] Đã check `known-issues.md` để tránh lặp lỗi cũ?
- [ ] Đã check `conventions.md` để follow đúng style?
