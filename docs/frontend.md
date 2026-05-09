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
├── layout.tsx              # Root layout — fonts, metadata, ThemeProvider (tương lai)
├── page.tsx                # / → client redirect: board (auth) hoặc login (no auth)
├── (auth)/
│   └── login/
│       └── page.tsx        # Login form — Basic Auth
└── (app)/                  # Route group: protected
    ├── layout.tsx           # Auth guard + Sidebar
    ├── board/
    │   └── page.tsx         # My Board — Kanban 3 cột
    └── issues/
        └── [key]/
            └── page.tsx     # Issue Detail — params.key = issue key (e.g. EMSPRO2-123)
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
│   └── transition-button.tsx # Lazy-load transitions, execute transition
│
└── sidebar.tsx             # Navigation sidebar — đọc user từ localStorage qua useEffect
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
