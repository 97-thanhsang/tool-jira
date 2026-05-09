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

## 🚧 Phase 2 — Core Workflow (NEXT)

> Goal: Dùng hàng ngày thay Jira được.

| # | Feature | Files cần tạo/sửa | Status |
|---|---------|-------------------|--------|
| 2.1 | **My Issues page** `/issues` — bảng filter+sort | `app/(app)/issues/page.tsx`, `components/issues/issues-table.tsx`, `hooks/use-issues-list.ts` | ⬜ Todo |
| 2.2 | **Log Work modal** — từ Issue Detail | `components/issue/log-work-modal.tsx` | ⬜ Todo |
| 2.3 | **Comment** — xem + thêm comment | `components/issue/comment-section.tsx`, `components/issue/comment-form.tsx` | ⬜ Todo |
| 2.4 | **Transition nhanh** — hoàn thiện UX | `components/issue/transition-button.tsx` (update) | ⬜ Todo |
| 2.5 | **Tạo Issue modal** — Ctrl+N | `components/create-issue-modal.tsx` | ⬜ Todo |
| 2.6 | **Global Search** — Ctrl+K command palette | `components/search/command-palette.tsx`, `hooks/use-search.ts` | ⬜ Todo |

---

## 🔜 Phase 3 — Power Features

| # | Feature | Mô tả | Status |
|---|---------|-------|--------|
| 3.1 | Projects browser `/projects` | Danh sách projects → Board của project | ⬜ Todo |
| 3.2 | Advanced Search / JQL builder | Visual builder → JQL → results | ⬜ Todo |
| 3.3 | Keyboard shortcuts full | G B, G I, L, C, ?, Ctrl+K | ⬜ Todo |
| 3.4 | Bulk Actions | Select nhiều issues → transition / assign / priority | ⬜ Todo |
| 3.5 | Worklog history | Tab "My Worklogs" — hôm nay / tuần này | ⬜ Todo |
| 3.6 | Settings page `/settings` | Jira URL, credentials, theme, shortcuts ref | ⬜ Todo |
| 3.7 | Dark mode | Toggle trong Settings, lưu localStorage | ⬜ Todo |
| 3.8 | Notifications | Poll `/notification` 60s, badge số trên sidebar | ⬜ Todo |

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
