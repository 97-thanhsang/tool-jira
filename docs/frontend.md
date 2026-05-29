# Frontend — Jira Power

> Đọc file này khi làm việc với `frontend/` folder.
> Cập nhật lần cuối: 2026-05-29

---

## Framework & Patterns

- **Next.js 16 App Router** — toàn bộ là Client Components (`'use client'`), không có SSR data fetching
- **`@/*` alias** → `frontend/` root (tsconfig paths)
- **`@base-ui/react`** — KHÔNG phải Radix UI. API khác nhau (xem `known-issues.md` GOTCHA-001)
- **Không có `app/api/`** — toàn bộ server logic nằm ở Express backend

---

## Route Structure

```
app/
├── layout.tsx                          # Root layout — fonts, dark-mode inline script
├── page.tsx                            # / → redirect /board (auth) hoặc /login
├── (auth)/
│   └── login/page.tsx                 # Login — Basic Auth, không cần auth guard
└── (app)/                              # Route group: auth guard + app shell
    ├── layout.tsx                      # Auth guard (useEffect) + Sidebar + CommandPalette
    │                                   # + CreateIssueModal + KeyboardShortcutsOverlay
    │                                   # + global keyboard shortcuts (G·B, G·I, C, L, ?, Ctrl+K)
    ├── board/page.tsx                  # My Board — Kanban drag-drop, edit mode, sub-grouping
    ├── issues/
    │   ├── page.tsx                    # My Issues — table, filters, bulk transition, worklog history tab
    │   └── [key]/page.tsx             # Issue Detail — wiki, comments, attachments, transitions, AI
    ├── projects/
    │   ├── page.tsx                    # Projects browser — grid of project cards
    │   └── [key]/page.tsx             # Project board — Kanban của một project
    ├── search/page.tsx                 # JQL Search — textarea + preset chips + results
    ├── team/page.tsx                   # Team Dashboard — worklogs, due tasks, biểu đồ giờ
    ├── team-plan/page.tsx             # Team Planner — sub-tasks grouped by assignee, est vs logged
    ├── worklog/page.tsx               # Worklog Calendar — week/month view, drag-drop entries
    └── settings/page.tsx             # Settings — AI key, account info, theme, shortcuts ref
```

**Auth guard** (`app/(app)/layout.tsx`):
```typescript
useEffect(() => {
  if (!isAuthenticated()) router.replace('/login');
}, [router]);
// KHÔNG check trong render body — hydration mismatch
```

**Global keyboard shortcuts** (sống ở app layout, không phải Sidebar):
- `G` → `B` : /board | `G` → `I` : /issues | `G` → `S` : /settings
- `C` : mở Create Issue modal
- `L` : mở Log Work modal (khi ở issue detail)
- `?` : toggle Shortcuts overlay
- `Ctrl+K` : Command Palette

---

## Component Map

```
components/
│
├── ui/                          # @base-ui/react wrappers với cva variants
│   ├── avatar.tsx               # User avatar với fallback initials
│   ├── badge.tsx                # Chip/tag với variant colors
│   ├── button.tsx               # Button với variants (default/outline/ghost/destructive)
│   ├── card.tsx                 # Card container
│   ├── calendar.tsx             # Date picker calendar
│   ├── combobox.tsx             # Searchable select
│   ├── date-picker.tsx          # Date input với calendar popup
│   ├── dropdown-menu.tsx        # Dropdown với @base-ui/react
│   ├── input.tsx                # Text input
│   ├── label.tsx                # Form label
│   ├── select.tsx               # Select input
│   ├── separator.tsx            # Divider line
│   ├── skeleton.tsx             # Loading placeholder
│   ├── spinner.tsx              # Loading spinner
│   └── tooltip.tsx              # Tooltip (dùng delay không phải delayDuration)
│
├── shared/                      # Dùng lại nhiều nơi
│   ├── status-badge.tsx         # Badge màu theo statusCategory (new/indeterminate/done)
│   ├── priority-icon.tsx        # Icon + label theo priority level
│   ├── filter-bar.tsx           # Unified filter bar (project/status/type/assignee/sprint/epic...)
│   ├── group-selector.tsx       # Team group picker dropdown
│   ├── group-by-controls.tsx    # Swimlane grouping toggles (Epic/Version/Assignee/None)
│   ├── multi-select-filter.tsx  # Checkbox multi-select cho filter dropdowns
│   ├── user-multi-filter.tsx    # Multi-user picker với 'Me' và 'Unassigned' presets
│   ├── tool-bar.tsx             # Action buttons row trên danh sách issues
│   └── loading-overlay.tsx      # Centered spinner overlay
│
├── board/                       # Board page
│   ├── kanban-board.tsx         # Drag-drop layout với @dnd-kit, DndContext, columns
│   ├── issue-card.tsx           # Card trong Kanban column (key, summary, assignee, priority, type)
│   ├── board-filters.tsx        # Filter state + JQL builder cho board
│   ├── board-quick-filters.tsx  # Preset chips (my issues, high priority, due this week)
│   ├── board-epic-panel.tsx     # Epic filter sidebar panel
│   ├── board-version-panel.tsx  # Fix version filter sidebar panel
│   ├── board-charts.tsx         # Stats: count by column, burndown chart
│   └── quick-view-panel.tsx     # Side panel xem nhanh issue bên cạnh board
│
├── issue/                       # Issue Detail page
│   ├── wiki-renderer.tsx        # Jira wiki markup → HTML (dùng lib/jira-wiki.ts)
│   ├── transition-button.tsx    # Dropdown status transitions, color-coded badges
│   ├── log-work-modal.tsx       # Modal log time + comment + AI parse
│   ├── comment-section.tsx      # List comments + add form + AI draft button
│   ├── attachment-gallery.tsx   # Lightbox cho images/attachments
│   └── pencil-v2-modal.tsx      # Inline field editor (dùng trong board edit mode)
│
├── issues/                      # My Issues page
│   ├── issues-table.tsx         # Table có selection, sort, bulk actions
│   ├── issue-row.tsx            # Single row với inline status/assignee editing
│   ├── issue-detail-panel.tsx   # Side panel xem chi tiết issue
│   ├── filter-panel.tsx         # Filter dropdowns cho issues page
│   ├── user-search-input.tsx    # Autocomplete user picker (gọi Jira user search API)
│   └── worklogs-tab.tsx         # localStorage worklog history + AI Sprint Review button
│
├── search/
│   └── command-palette.tsx      # Ctrl+K overlay — search + recent issues (SWR + localStorage)
│
├── team/                        # Team pages
│   ├── team-report-table.tsx    # Grid: user → tasks với hours
│   ├── team-filters.tsx         # Filter: group, date range, project
│   ├── team-export.tsx          # Export table to CSV
│   ├── inline-editors.tsx       # Inline field editors cho team plan
│   └── save-confirm-modal.tsx   # Xác nhận trước khi batch-save edits
│
├── worklog/                     # Worklog Calendar page
│   ├── worklog-calendar.tsx     # Calendar grid (week/month), DndContext
│   ├── worklog-day-cell.tsx     # Single day cell: header + entries list
│   ├── worklog-entry-card.tsx   # Draggable entry card (issue key + hours + project color)
│   ├── worklog-drawer.tsx       # Right drawer: detail + edit form (time, date, comment)
│   ├── worklog-filters.tsx      # Period + user + project filter bar
│   └── worklog-filter-bar.tsx   # Compact filter bar variant
│
├── sidebar.tsx                  # Left navigation (collapsible, nav items, notifications badge)
├── create-issue-modal.tsx       # Create issue form (C shortcut — state ở app layout)
└── keyboard-shortcuts-overlay.tsx  # ? key overlay — reference card
```

---

## Hooks (`hooks/use-*.ts`)

Tất cả hooks dùng SWR với `revalidateOnFocus: false`, `dedupingInterval: 30000`.

| Hook | SWR Key | Trả về |
|------|---------|--------|
| `use-my-issues` | `/search` | `{ grouped: {todo, inProgress, done}, total, isLoading, error, mutate }` |
| `use-issue` | `/issue/${key}` | `{ issue, isLoading, error, mutate }` |
| `use-issues-list` | `/search-issues-list` | `{ issues, total, isLoading, error, mutate, epicSummaries }` |
| `use-projects` | `/project` | `{ projects, isLoading, error, mutate }` |
| `use-jql-search` | `['jql-search', jql]` | `{ issues, total, isLoading, error }` |
| `use-search` | `['search-palette', query]` | `{ results, isLoading }` — debounce 300ms, min 2 ký tự |
| `use-worklogs` | `['worklogs', user, from, to, project]` | `{ data, entriesByDate, isLoading, error, mutate }` |
| `use-worklog-mutations` | — | `{ add, update, remove, toast }` — CRUD + toast notifications |
| `use-board-state` | — | `{ grouped, dynamicColumns, total, isLoading, error, mutate, moveCard, toast }` |
| `use-filter-data` | — | `useSprints()`, `useStatuses()` — cho filter dropdowns |
| `use-status-columns` | — | `{ statusColumnMap, isLoading, error }` |
| `use-team-dashboard` | — | `{ data: TeamReportData, dueTasks, isLoading, error, mutate }` |
| `use-team-plan` | — | `{ data: TeamReportData, isLoading, error, mutate }` |

**Thêm hook mới:** đặt trong `hooks/`, prefix `use-`, export named function, dùng SWR pattern chuẩn (xem `conventions.md`).

---

## Lib (`lib/`)

| File | Mô tả |
|------|-------|
| `api.ts` | Axios instance (`baseURL = NEXT_PUBLIC_API_URL/api/jira`). Request interceptor: gắn `X-Jira-Auth`. Response interceptor: 401 → clearAuth() + redirect /login. Exports: `saveAuth`, `clearAuth`, `getStoredUser`, `isAuthenticated`, `getAuthHeader` |
| `ai.ts` | AI helper — gọi `/api/ai/*` qua backend. Đọc `ai_api_key` từ localStorage, gửi `X-AI-Key` header. Functions: `aiSummarize`, `aiDraftComment`, `aiParseWorklog`, `aiSuggestTransition`, `aiSprintReview`. Throw nếu không có key. |
| `worklog-api.ts` | CRUD worklogs. Functions: `fetchWorklogs(username, dateFrom, dateTo)`, `fetchTodayWorklogs(username)`, `fetchIssueWorklogTotal(issueKey)`, `addWorklog(payload)`, `updateWorklog(...)`, `deleteWorklog(...)` |
| `team-api.ts` | Team metrics. Functions: `fetchTeamWorklogs(...)`, `fetchTeamDueDates(...)`, `fetchTeamFilterMeta(...)` |
| `team-plan-api.ts` | Team planning. Function: `fetchTeamPlan(...)` — batch-fetch sub-tasks + parent metadata |
| `transitions.ts` | Issue transitions. Functions: `moveIssue(key, targetColumnId)`, `moveIssueToStatus(key, statusId)`, `moveIssueToAnyStatus(key, statusIds[])` |
| `worklogs.ts` | localStorage worklog cache. Functions: `saveWorklog(entry)` (max 20), `getWorklogs()`, `useWorklogs()` hook |
| `jira-wiki.ts` | Parser: Jira wiki markup → HTML. Hỗ trợ: h1-h6, bold, italic, lists, code blocks, links, colors, tables, mentions, images (resolve từ attachment map) |
| `filter-constants.ts` | `ISSUE_TYPES`, `PRIORITY_OPTIONS`, `USER_PRESETS`, `UnifiedFilters` interface, `EMPTY_UNIFIED_FILTERS` |
| `team-constants.ts` | `DEFAULT_GROUPS` (R&D-X, Frontend, Backend), `MEMBER_DISPLAY_NAMES` (username → display name) |
| `utils.ts` | `cn(...inputs)` — merge Tailwind classes với clsx + twMerge |

---

## Types (`types/jira.ts`)

Tất cả Jira entity types. Quan trọng nhất:

```typescript
JiraUser          // name, displayName, emailAddress, avatarUrls
JiraStatus        // id, name, statusCategory { key: 'new'|'indeterminate'|'done', colorName }
JiraPriority      // name, iconUrl
JiraIssueType     // name, subtask: boolean, iconUrl
JiraAttachment    // id, filename, mimeType, size, created, content, thumbnail, author
JiraIssue         // id, key, fields { summary, description, status, priority, issuetype,
                  //   assignee, reporter, project, created, updated, duedate, subtasks,
                  //   parent, labels, comment, attachment, timetracking, fixVersions,
                  //   components, sprint, customfield_10020 }
JiraComment       // id, author, body, created
JiraTransition    // id, name, to: JiraStatus
JiraProject       // id, key, name, projectTypeKey
JiraBoard         // id, name, type, self
JiraBoardConfig   // id, name, columnConfig { columns[] với statuses + WIP limits }
WorklogEntry      // id, issueKey, issueSummary, projectKey, author, timeSpent, timeSpentSeconds, started, comment
WorklogSearchResult // entries[], total, totalHours, dailyHours: Record<date, hours>
TaskReport        // sub-task với est/logged/duedate/parent info
UserReport        // user + tasks[] + totals
TeamReportData    // users[], dateRange, totals, counts
TeamGroup         // id, name, members: string[]
```

**Khi thêm type mới:** thêm vào cuối `types/jira.ts`, export named interface.

---

## Styling

```
Primary:    #0052CC  (Jira blue)
Hover:      #0065FF
Text dark:  #172B4D
Text muted: #5E6C84
Border:     #DFE1E6
Background: #F4F5F7
Success:    #36B37E
Warning:    #FF8B00
Danger:     #DE350B

Dark mode: Tailwind v4 via @custom-variant, toggled by class="dark" trên <html>
```

---

## Thêm trang mới

```
1. Tạo: app/(app)/{route}/page.tsx  (default export, 'use client')
2. Thêm nav item vào: components/sidebar.tsx
3. Nếu cần data: tạo hook trong hooks/use-{name}.ts
4. Cập nhật: docs/frontend.md — Route Structure + Hooks + Component Map
```
