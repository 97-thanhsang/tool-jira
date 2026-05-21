# Tool-Jira Docs — AI Context Index

> **Dành cho AI agents (OpenCode, Claude, Cursor, etc.)**
> Đọc file này trước tiên. Sau đó đọc đúng context file cho phần bạn sẽ làm việc.

---

## 🗂️ Cấu trúc docs

| File | Khi nào đọc |
|------|-------------|
| [`project-overview.md`](./project-overview.md) | Luôn đọc — kiến trúc tổng quan, mục tiêu, tech stack |
| [`backend.md`](./backend.md) | Làm việc với `backend/` — routes, proxy, DB |
| [`frontend.md`](./frontend.md) | Làm việc với `frontend/` — pages, components, hooks |
| [`data-flow.md`](./data-flow.md) | Hiểu auth flow, API call chain, localStorage |
| [`roadmap.md`](./roadmap.md) | Xem kế hoạch, chọn phase tiếp theo |
| [`conventions.md`](./conventions.md) | Coding conventions, naming rules, anti-patterns |
| [`known-issues.md`](./known-issues.md) | Bugs đã fix, gotchas quan trọng PHẢI biết |

---

## ⚡ Quick Context (cho tác vụ nhanh)

```
Project: Tool-Jira — Jira alternative UI cá nhân
Stack:   Next.js 16 (App Router) + Express v5 + Drizzle ORM (SQLite/PG) + @base-ui/react + SWR + Tailwind v4
Auth:    Basic Auth → localStorage → X-Jira-Auth header
Jira:    https://task.ascvn.com.vn (REST API v2)
Repo:    https://github.com/97-thanhsang/tool-jira
Root:    E:\SOURCE\jira\
BE port: 3001  |  FE port: 3000
```

---

## 🔄 Quy tắc cập nhật docs (QUAN TRỌNG)

**AI PHẢI cập nhật docs ngay sau khi:**
1. Implement xong một feature mới → cập nhật `roadmap.md` (đánh dấu done) + file context liên quan
2. Thêm file/component mới → cập nhật `frontend.md` hoặc `backend.md`
3. Fix bug quan trọng → cập nhật `known-issues.md`
4. Thay đổi data flow / auth → cập nhật `data-flow.md`
5. Thay đổi convention → cập nhật `conventions.md`

**Format cập nhật:** Thêm entry mới, KHÔNG xóa entry cũ (để giữ lịch sử).

---

## 📋 Checklist trước khi implement

- [ ] Đã đọc `project-overview.md`?
- [ ] Đã đọc context file cho phần sẽ làm?
- [ ] Đã check `known-issues.md` để tránh lặp lỗi cũ?
- [ ] Đã check `conventions.md` để follow đúng style?
