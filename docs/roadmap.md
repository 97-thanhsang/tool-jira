# Roadmap — Tool-Jira

> Kế hoạch phát triển đầy đủ. Cập nhật status sau mỗi feature hoàn thành.
> Cập nhật lần cuối: 2026-05-10

---

## ✅ Phase 1 — MVP Tracer Bullet (DONE)

| # | Feature | Files | Status |
|---|---------|-------|--------|
| 1.1 | Backend proxy Express v5 + SQLite | `backend/src/` | ✅ Done |
| 1.2 | Login page với Basic Auth | `app/(auth)/login/` | ✅ Done |
| 1.3 | App Shell — Sidebar, protected layout | `app/(app)/layout.tsx`, `components/sidebar.tsx` | ✅ Done |
| 1.4 | My Board — Kanban 3 cột | `app/(app)/board/`, `components/board/` | ✅ Done |
| 1.5 | Issue Detail — wiki, transitions, metadata | `app/(app)/issues/[key]/` | ✅ Done |
| 1.6 | Git setup + push GitHub | — | ✅ Done |
| 1.7 | Hydration bug fix (Sidebar localStorage) | `components/sidebar.tsx` | ✅ Done |
| 1.8 | Docs folder (`docs/`) | `docs/` | ✅ Done |

---

## ✅ Phase 2 — Core Workflow (DONE)

> Goal: Dùng hàng ngày thay Jira được.

| # | Feature | Files cần tạo/sửa | Status |
|---|---------|-------------------|--------|
| 2.1 | **My Issues page** `/issues` — bảng filter+sort | `app/(app)/issues/page.tsx`, `components/issues/issues-table.tsx`, `components/issues/issue-row.tsx`, `hooks/use-issues-list.ts` | ✅ Done |
| 2.2 | **Log Work modal** — từ Issue Detail | `components/issue/log-work-modal.tsx` | ✅ Done |
| 2.3 | **Comment** — xem + thêm comment | `components/issue/comment-section.tsx` | ✅ Done |
| 2.4 | **Transition nhanh** — hoàn thiện UX | `components/issue/transition-button.tsx` (color-coded) | ✅ Done |
| 2.5 | **Tạo Issue modal** — C key shortcut | `components/create-issue-modal.tsx`, `components/sidebar.tsx` (+ Create button) | ✅ Done |
| 2.6 | **Global Search** — Ctrl+K command palette | `components/search/command-palette.tsx`, `hooks/use-search.ts`, `app/(app)/layout.tsx` | ✅ Done |

---

## ✅ Phase 3 — Power Features (DONE)

| # | Feature | Mô tả | Status |
|---|---------|-------|--------|
| 3.1 | Projects browser `/projects` | Danh sách projects → Board của project | ✅ Done |
| 3.2 | Advanced Search / JQL builder | JQL textarea + preset chips → results table | ✅ Done |
| 3.3 | Keyboard shortcuts full | G B, G I, G S, C, L, ?, Ctrl+K — global listener in layout | ✅ Done |
| 3.4 | Bulk Actions | Select nhiều issues → transition dropdown (sequential) | ✅ Done |
| 3.5 | Worklog history | Tab "Worklog History" trên /issues — localStorage based | ✅ Done |
| 3.6 | Settings page `/settings` | Account, Connection, Shortcuts ref, Dark mode toggle | ✅ Done |
| 3.7 | Dark mode | Inline script tránh flash, toggle trong Settings, dark: variants | ✅ Done |
| 3.8 | Notifications | Poll /search?jql=updated>=-15m 60s, badge + dropdown sidebar | ✅ Done |

---

## 🤖 Phase 4 — AI Integration

> Bắt đầu sau khi Phase 2+3 web cơ bản hoàn chỉnh.

| # | Feature | Mô tả | Status |
|---|---------|-------|--------|
| 4.1 | Settings — API key input | User nhập OpenAI/Gemini API key → localStorage | ⬜ Todo |
| 4.2 | AI Summarize issue | Nút "✨ Summarize" → 3-5 bullet từ description+comments | ⬜ Todo |
| 4.3 | AI Draft Comment | Nút "✨ Draft" → AI generate, user edit rồi submit | ⬜ Todo |
| 4.4 | AI Draft Log Work | Nhập natural language → AI parse thành time+comment | ⬜ Todo |
| 4.5 | AI Suggest Transition | Đọc context → suggest status tiếp theo phù hợp | ⬜ Todo |
| 4.6 | AI Sprint Review | Worklog tuần → báo cáo markdown | ⬜ Todo |

---

## 🐘 Phase 5 — Production Ready

| # | Feature | Mô tả | Status |
|---|---------|-------|--------|
| 5.1 | PostgreSQL migration | Drizzle schema đã sẵn sàng, đổi connection string | ⬜ Todo |
| 5.2 | Docker Compose | `docker-compose up` → full stack chạy ngay | ⬜ Todo |
| 5.3 | README setup guide | Clone → `.env` → chạy → dùng | ⬜ Todo |
| 5.4 | Rate limiting + error boundary | `express-rate-limit`, React ErrorBoundary | ⬜ Todo |
| 5.5 | Offline indicator | Detect network status, show banner | ⬜ Todo |

---

## Thứ tự build đề xuất

```
2.1 → 2.2 → 2.3 → 2.6 → 2.4 → 2.5
  ↓
3.6 → 3.3 → 3.7
  ↓
3.1 → 3.2 → 3.4 → 3.5 → 3.8
  ↓
4.1 → 4.2 → 4.3 → 4.4 → 4.5 → 4.6
  ↓
5.x
```

---

## Changelog

| Ngày | Thay đổi |
|------|---------|
| 2026-05-10 | Phase 1 hoàn thành, docs khởi tạo, hydration bug fix |
| 2026-05-10 | Phase 2 hoàn thành: My Issues page, Log Work, Comments, Transition UX, Create Issue modal, Ctrl+K global search |
| 2026-05-10 | Phase 3 hoàn thành: Settings, Keyboard Shortcuts, Dark Mode, Projects Browser, JQL Search, Worklog History, Bulk Actions, Notifications Badge |
