# Roadmap — Jira Power

> Kế hoạch phát triển và trạng thái hiện tại.
> Cập nhật lần cuối: 2026-05-29

---

## ✅ Phase 1 — MVP

| # | Feature | Files | Status |
|---|---------|-------|--------|
| 1.1 | Backend proxy Express v5 + SQLite/Drizzle | `backend/src/` | ✅ Done |
| 1.2 | Login page với Basic Auth | `app/(auth)/login/` | ✅ Done |
| 1.3 | App shell — Sidebar, protected layout | `app/(app)/layout.tsx`, `components/sidebar.tsx` | ✅ Done |
| 1.4 | My Board — Kanban 3 cột, drag-drop | `app/(app)/board/`, `components/board/` | ✅ Done |
| 1.5 | Issue Detail — wiki, transitions, metadata | `app/(app)/issues/[key]/` | ✅ Done |

---

## ✅ Phase 2 — Core Workflow

| # | Feature | Files | Status |
|---|---------|-------|--------|
| 2.1 | My Issues `/issues` — table, filter, sort | `issues/page.tsx`, `components/issues/` | ✅ Done |
| 2.2 | Log Work modal | `components/issue/log-work-modal.tsx` | ✅ Done |
| 2.3 | Comments — xem + thêm | `components/issue/comment-section.tsx` | ✅ Done |
| 2.4 | Transition nhanh — color-coded badges | `components/issue/transition-button.tsx` | ✅ Done |
| 2.5 | Create Issue modal — phím C | `components/create-issue-modal.tsx` | ✅ Done |
| 2.6 | Global Search — Ctrl+K | `components/search/command-palette.tsx`, `hooks/use-search.ts` | ✅ Done |

---

## ✅ Phase 3 — Power Features

| # | Feature | Files | Status |
|---|---------|-------|--------|
| 3.1 | Projects browser + project board | `projects/page.tsx`, `projects/[key]/page.tsx` | ✅ Done |
| 3.2 | JQL Search `/search` | `search/page.tsx`, `hooks/use-jql-search.ts` | ✅ Done |
| 3.3 | Keyboard shortcuts — G·B/I/S, C, L, ?, Ctrl+K | `app/(app)/layout.tsx` | ✅ Done |
| 3.4 | Bulk Actions — select nhiều → transition | `components/issues/issues-table.tsx` | ✅ Done |
| 3.5 | Worklog history — localStorage tab | `components/issues/worklogs-tab.tsx` | ✅ Done |
| 3.6 | Settings page `/settings` | `settings/page.tsx` | ✅ Done |
| 3.7 | Dark mode | `app/layout.tsx` (inline script), globals.css | ✅ Done |
| 3.8 | Notifications — poll 60s, badge + dropdown | `components/sidebar.tsx` | ✅ Done |

---

## ✅ Phase 4 — AI Integration (Gemini 2.5 Flash)

| # | Feature | Files | Status |
|---|---------|-------|--------|
| 4.1 | AI API key input trong Settings | `settings/page.tsx` | ✅ Done |
| 4.2 | AI Summarize issue | `lib/ai.ts`, `backend/routes/ai.ts` | ✅ Done |
| 4.3 | AI Draft Comment | `components/issue/comment-section.tsx` | ✅ Done |
| 4.4 | AI Parse Worklog — natural language → timeSpent | `components/issue/log-work-modal.tsx` | ✅ Done |
| 4.5 | AI Suggest Transition | `components/issue/transition-button.tsx` | ✅ Done |
| 4.6 | AI Sprint Review — worklogs → markdown report | `components/issues/worklogs-tab.tsx` | ✅ Done |

---

## ✅ Phase 5A — Extended Features

| # | Feature | Files | Status |
|---|---------|-------|--------|
| 5.1 | Team Dashboard `/team` | `team/page.tsx`, `hooks/use-team-dashboard.ts` | ✅ Done |
| 5.2 | Team Workload Planner `/team-plan` | `team-plan/page.tsx`, `hooks/use-team-plan.ts` | ✅ Done |
| 5.3 | Worklog Calendar `/worklog` — week/month, drag-drop | `worklog/page.tsx`, `components/worklog/` | ✅ Done |
| 5.4 | Board enhancements — edit mode, sub-grouping, epic/version filter | `board/page.tsx`, `components/board/` | ✅ Done |
| 5.5 | Avatar proxy + Attachment gallery | `backend/routes/jira.ts`, `components/issue/attachment-gallery.tsx` | ✅ Done |
| 5.6 | Docker Compose full stack | `docker-compose.yml`, `Dockerfile` (FE + BE) | ✅ Done |

---

## 🔄 Phase 5B — Production Ready

| # | Feature | Mô tả | Status |
|---|---------|-------|--------|
| 5B.1 | PostgreSQL migration guide | README setup với PG | ⬜ Todo |
| 5B.2 | README.md | Clone → `.env` → run → dùng | ⬜ Todo |
| 5B.3 | Rate limiting | `express-rate-limit` cho `/api/jira/*` | ⬜ Todo |
| 5B.4 | React Error Boundaries | Bắt lỗi component-level, không crash cả app | ⬜ Todo |
| 5B.5 | Offline indicator | Detect network, show banner | ⬜ Todo |

---

## Changelog

| Ngày | Thay đổi |
|------|---------|
| 2026-05-09 | Phase 1: Backend proxy, Login, Board, Issue Detail |
| 2026-05-10 | Phase 2: My Issues, Log Work, Comments, Transitions, Create Issue, Ctrl+K |
| 2026-05-10 | Phase 3: Settings, Dark Mode, Projects, JQL Search, Keyboard Shortcuts, Bulk Actions, Worklog History, Notifications |
| 2026-05-10 | Phase 4: AI Integration — Gemini 2.5 Flash (Settings key, Summarize, Draft Comment, Parse Worklog, Suggest Transition, Sprint Review) |
| 2026-05-21 | Phase 5A: Team Dashboard, Team Planner, Worklog Calendar, Board enhancements, Avatar/Attachment proxy, Docker Compose |
| 2026-05-29 | Docs refactor — cập nhật toàn bộ docs/*, xóa file thừa |
