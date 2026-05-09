# Frontend Context — Tool-Jira

> Đọc file này khi làm việc với `frontend/` folder.
> Cập nhật lần cuối: 2026-05-10

---

## Framework

**Next.js 14 App Router** + TypeScript + Tailwind CSS + shadcn/ui

---

## Route Structure

```
app/
├── layout.tsx              # Root layout — fonts, metadata, dark-mode inline script
├── page.tsx                # / → client redirect: board (auth) hoặc login (no auth)
├── (auth)/
│   └── login/
│       └── page.tsx        # Login form — Basic Auth
└── (app)/                  # Route group: protected
    ├── layout.tsx           # Auth guard + Sidebar + CommandPalette + CreateIssueModal + ShortcutsOverlay + global kbd
    ├── board/
    │   └── page.tsx         # My Board — Kanban 3 cột
    ├── issues/
    │   ├── page.tsx         # My Issues — filterable table + Worklogs tab (Phase 2.1 + 3.5)
    │   └── [key]/
    │       └── page.tsx     # Issue Detail — params.key = issue key (e.g. EMSPRO2-123)
    ├── projects/
    │   ├── page.tsx         # Projects browser — grid of cards (Phase 3.1)
    │   └── [key]/
    │       └── page.tsx     # Project detail — Kanban of my open issues (Phase 3.1)
    ├── search/
    │   └── page.tsx         # JQL Search — textarea + preset chips + results (Phase 3.2)
    └── settings/
        └── page.tsx         # Settings — account, connection, shortcuts ref, dark mode (Phase 3.6+3.7)
```

**Route groups `(auth)` và `(app)`:** Chỉ là grouping logic, không ảnh hưởng URL.

---

## Auth Guard

`app/(app)/layout.tsx` — Client Component với `useEffect`:

```typescript
useEffect(() => {
  if (!isAuthenticated()) router.replace('/login');
}, [router]);
```

**Quan trọng:** Check auth trong `useEffect`, KHÔNG phải trong render body — tránh hydration mismatch.

---

## Component Map

```
components/
├── ui/                     # shadcn/ui primitives — KHÔNG sửa trực tiếp
│   ├── avatar.tsx
│   ├── badge.tsx
│   ├── button.tsx
│   ├── card.tsx
│   ├── dropdown-menu.tsx
│   ├── input.tsx
│   ├── label.tsx
│   ├── separator.tsx
│   ├── skeleton.tsx
│   └── tooltip.tsx
│
├── shared/                 # Dùng lại nhiều nơi
│   ├── status-badge.tsx    # Badge màu theo Jira status category
│   └── priority-icon.tsx   # Icon theo priority (Highest/High/Medium/Low/Lowest)
│
├── board/                  # Board-specific
│   ├── issue-card.tsx      # Card trong Kanban column
│   └── kanban-board.tsx    # 3 columns layout
│
├── issue/                  # Issue Detail-specific
│   ├── wiki-renderer.tsx   # Jira wiki markup → HTML (dùng lib/jira-wiki.ts)
│   ├── transition-button.tsx # Lazy-load transitions, color-coded badges (Phase 2.4)
│   ├── log-work-modal.tsx  # Modal log work (Phase 2.2) — saves to localStorage on success
│   └── comment-section.tsx # Danh sách + thêm comment (Phase 2.3)
│
├── issues/                 # My Issues page-specific (Phase 2.1 + 3.4 + 3.5)
│   ├── issues-table.tsx    # Table + filter bar + bulk selection + transition bar
│   ├── issue-row.tsx       # Single row in table
│   └── worklogs-tab.tsx    # Worklog history tab (localStorage) (Phase 3.5)
│
├── search/                 # Global search (Phase 2.6)
│   └── command-palette.tsx # Ctrl+K overlay — search + recent issues
│
├── create-issue-modal.tsx  # Tạo issue modal (Phase 2.5) — state in layout
├── keyboard-shortcuts-overlay.tsx  # ? overlay — shortcuts reference (Phase 3.3)
└── sidebar.tsx             # Navigation sidebar + Bell icon + Notifications dropdown (Phase 3.8)
```

---

## shadcn/ui — Quan trọng (khác với docs chuẩn)

Dự án này dùng `@base-ui/react` (không phải Radix UI):

```typescript
// ❌ Radix UI syntax (KHÔNG dùng)
<TooltipProvider delayDuration={300}>
<DropdownMenuTrigger asChild>

// ✅ base-ui syntax (ĐÚNG cho project này)
<TooltipProvider delay={300}>
<DropdownMenuTrigger>   // không có asChild prop
```

---

## Hooks

### `hooks/use-my-issues.ts`
- Dùng SWR, gọi `/search` với JQL: `assignee = currentUser() AND resolution = Unresolved`
- Return: `{ grouped: { todo, inProgress, done }, total, isLoading, error, mutate }`
- Grouping theo `statusCategory.key`: `'new'` → todo, `'indeterminate'` → inProgress, `'done'` → done

### `hooks/use-issue.ts`
- Dùng SWR, gọi `/issue/{key}?fields=...`
- Return: `{ issue, isLoading, error, mutate }`
- Includes `comment` field để hiện danh sách comments

### `hooks/use-issues-list.ts` (Phase 2.1)
- Dùng SWR key `/search-issues-list` (khác với `use-my-issues.ts`)
- JQL: `assignee = currentUser() AND resolution = Unresolved ORDER BY updated DESC`
- Return: `{ issues, total, isLoading, error, mutate }`

### `hooks/use-search.ts` (Phase 2.6)
- Nhận `query: string`, debounce 300ms nội tại
- Fetch chỉ khi query >= 2 chars
- SWR key: `['search-palette', debouncedQuery]`
- Return: `{ results, isLoading }`

### `hooks/use-projects.ts` (Phase 3.1)
- Dùng SWR, gọi `/project`
- Return: `{ projects, isLoading, error, mutate }`
- Cache 60s, revalidateOnFocus: false

### `hooks/use-jql-search.ts` (Phase 3.2)
- Nhận `jql: string`, fetch khi jql không rỗng
- SWR key: `['jql-search', jql]`
- Return: `{ issues, total, isLoading, error }`

**Khi thêm hook mới:** đặt trong `hooks/`, prefix `use-`, export named function.

---

## Lib

### `lib/api.ts` — Axios instance + auth

```typescript
// Instance: baseURL = NEXT_PUBLIC_API_URL/api/jira
// Request interceptor: gắn X-Jira-Auth header từ localStorage
// Response interceptor: 401 → clearAuth() + redirect /login

// Helpers:
saveAuth(username, password, user)  // encode → localStorage
clearAuth()                          // xóa localStorage
getStoredUser()                      // đọc user từ localStorage (null-safe)
isAuthenticated()                    // boolean, check localStorage
getAuthHeader()                      // base64 encoded auth string
```

### `lib/worklogs.ts` (Phase 3.5)
- `saveWorklog(entry)` — append to `recent_worklogs` localStorage (max 20)
- `getWorklogs()` — read from localStorage (null-safe)
- `useWorklogs()` — hook: reads in `useEffect`, returns `{ worklogs, refresh }`

**⚠️ localStorage chỉ đọc ở client-side.** Luôn dùng `useEffect` hoặc guard `typeof window !== 'undefined'`.

### `lib/jira-wiki.ts`
Parser: Jira wiki markup → HTML string. Hỗ trợ: bold, italic, headers, lists, code blocks, links, color, table, mentions.

### `lib/utils.ts`
Chỉ có `cn()` helper (merge Tailwind classes).

---

## TypeScript Types (`types/jira.ts`)

```typescript
JiraUser        // name, displayName, emailAddress, avatarUrls
JiraStatus      // name, statusCategory { key, colorName }
JiraPriority    // name, iconUrl
JiraIssueType   // name, subtask, iconUrl
JiraIssue       // id, key, fields { summary, description, status, priority, ... }
JiraComment     // id, author, body, created
JiraTransition  // id, name, to
JiraSearchResult // total, issues[]
JiraProject     // id, key, name, projectTypeKey (Phase 2.5)
```

**Khi thêm type mới:** thêm vào `types/jira.ts`, export named interface.

---

## Styling Conventions

```
Primary color: #0052CC  (Jira blue)
Hover:         #0065FF
Text dark:     #172B4D
Text muted:    #5E6C84
Border:        #DFE1E6
Background:    #F4F5F7

Sidebar:       bg-[#0052CC] text-white
Active nav:    bg-white/20
Inactive nav:  text-blue-100 hover:bg-white/10
```

---

## Thêm trang mới

```
1. Tạo: app/(app)/{route}/page.tsx
2. Thêm vào navItems trong components/sidebar.tsx
3. Nếu cần data: tạo hook trong hooks/use-{name}.ts
4. Cập nhật docs/frontend.md
```

---

## Environment Variables

File: `frontend/.env.local` (gitignored)

```
NEXT_PUBLIC_API_URL=http://localhost:3001
```
