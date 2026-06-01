# Known Issues & Gotchas — Jira Power

> Bugs đã fix và lessons learned. Đọc trước khi debug hoặc thêm tính năng mới.
> Cập nhật lần cuối: 2026-05-29

---

## Template thêm entry mới

```markdown
## [FIXED/KNOWN/GOTCHA] Tên vấn đề

**ID:** `BUG-XXX` hoặc `GOTCHA-XXX`
**Ngày:** YYYY-MM-DD
**Severity:** Critical / High / Medium / Low

### Triệu chứng
### Root Cause
### Fix / Workaround
```

---

## [FIXED] Express v5 Wildcard Breaking Change

**ID:** `BUG-001` | **Ngày fix:** 2026-05-09 | **Severity:** Critical

### Triệu chứng
```
TypeError: Missing parameter name at 1
path-to-regexp error khi start backend
```

### Root Cause
Express v5 dùng `path-to-regexp` v8 — wildcards phải có tên.

### Fix
File: `backend/src/routes/jira.ts`
```typescript
// ❌ Express v4
router.all('/*', handler)

// ✅ Express v5
router.all('/*path', handler)
req.params['path']
```

---

## [FIXED] Hydration Mismatch — Sidebar đọc localStorage trong render

**ID:** `BUG-002` | **Ngày fix:** 2026-05-10 | **Severity:** High

### Triệu chứng
```
Hydration failed because the server rendered text didn't match the client.
```

### Root Cause
Component đọc `getStoredUser()` trực tiếp trong render body — SSR trả `null`, client trả tên thật → mismatch.

### Fix
```typescript
// ❌ Before
const user = getStoredUser();

// ✅ After
const [user, setUser] = useState(null);
useEffect(() => { setUser(getStoredUser()); }, []);
```

**Nguyên tắc:** Bất kỳ component nào đọc `localStorage` đều phải dùng `useEffect`.

---

## [FIXED] Browser Extension inject className vào `<html>`

**ID:** `BUG-003` | **Ngày fix:** 2026-05-10 | **Severity:** Low (chỉ là warning)

### Triệu chứng
```
A tree hydrated but some attributes of the server rendered HTML didn't match the client.
<html className="mdl-js"
```

### Root Cause
Browser extension inject `class="mdl-js"` vào `<html>` trước khi React hydrate.

### Fix
File: `app/layout.tsx`
```tsx
<html lang="en" suppressHydrationWarning>
```

---

## [FIXED] Express v5 `/*path` captures ARRAY cho nested paths

**ID:** `BUG-004` | **Ngày fix:** 2026-05-10 | **Severity:** Critical

### Triệu chứng
```
GET /api/jira/issue/PROJ-123/transitions → 404
GET /api/jira/issue/PROJ-123/worklog → 404
```

### Root Cause
Express v5: `/*path` capture nested path thành **array**, không phải string.
```javascript
// Input: /issue/KEY/transitions
req.params['path'] === ['issue', 'KEY', 'transitions']  // ARRAY!
```

### Fix
```typescript
const rawPath = req.params['path'];
const jiraPath = Array.isArray(rawPath) ? rawPath.join('/') : (rawPath ?? '');
```

---

## [GOTCHA] @base-ui/react KHÔNG phải Radix UI

**ID:** `GOTCHA-001`

Dự án này dùng `@base-ui/react` thay vì Radix UI. API khác nhau:

```typescript
// ❌ Radix syntax (copy từ shadcn docs — KHÔNG dùng)
<TooltipProvider delayDuration={300}>
<DropdownMenuTrigger asChild>
<DialogTrigger asChild>

// ✅ base-ui syntax (ĐÚNG cho project này)
<TooltipProvider delay={300}>
<DropdownMenuTrigger>    // không có asChild prop
<DialogTrigger>           // không có asChild prop
```

Khi thêm component mới: import từ `@/components/ui/*`, check API của `@base-ui/react`, không dùng Radix docs.

---

## [GOTCHA] Jira API v2 — các field có thể null

**ID:** `GOTCHA-002`

Một số field Jira có thể null dù TypeScript type không mark optional:

```typescript
issue.fields.description    // null nếu không có mô tả
issue.fields.assignee       // null nếu unassigned
issue.fields.parent         // undefined nếu không có parent issue
issue.fields.comment        // undefined nếu không request field này
issue.fields.sprint         // null nếu issue chưa assign sprint

// Luôn guard:
issue.fields.description ?? ''
issue.fields.assignee?.displayName ?? 'Unassigned'
```

---

## [GOTCHA] Next.js App Router — params là Promise

**ID:** `GOTCHA-003`

Trong Next.js 16 App Router, `params` từ dynamic routes là `Promise`:

```typescript
// ✅ Page component (async)
export default async function IssuePage({
  params,
}: { params: Promise<{ key: string }> }) {
  const { key } = await params;
}

// ✅ Hoặc Client Component
const { key } = use(paramsPromise);  // React.use()
```

---

## [GOTCHA] SWR stale data sau logout/login

**ID:** `GOTCHA-004`

SWR cache key là URL string. Nếu user logout rồi login với account khác, SWR có thể trả data của user cũ.

**Workaround hiện tại:** `router.replace('/board')` sau login → Next.js unmount/remount → SWR reset.  
**Fix đúng (future):** Thêm username vào SWR key: `['search', username]`.

---

## [GOTCHA] SWR key collision

**ID:** `GOTCHA-005`

Nhiều hooks gọi cùng endpoint `/search` với params khác nhau. Nếu dùng cùng SWR key → cache bị share → data sai.

```typescript
// Mỗi hook dùng key riêng:
use-my-issues    → key: '/search'
use-issues-list  → key: '/search-issues-list'   ← khác nhau!
use-search       → key: ['search-palette', query]
use-jql-search   → key: ['jql-search', jql]
```

---

## [GOTCHA] Dark mode — Tailwind v4 không dùng config

**ID:** `GOTCHA-006`

Tailwind v4 dùng `@custom-variant dark (&:is(.dark *))` trong `globals.css` — không cần `tailwind.config.ts`. Inline script trong `app/layout.tsx` apply class `dark` lên `<html>` TRƯỚC khi React hydrate (tránh flash).

---

## [GOTCHA] Create Issue modal state — sống ở app layout

**ID:** `GOTCHA-007`

`createOpen` state nằm ở `app/(app)/layout.tsx`, không phải Sidebar. Sidebar nhận prop `onCreateClick: () => void`. Phím tắt `C` và nút sidebar đều trigger cùng một state ở layout.

Nếu cần trigger Create Issue từ nơi khác → dispatch `CustomEvent` hoặc thêm prop tương tự.

---

## [GOTCHA] TransitionButton — nhận JiraStatus object, không phải string

**ID:** `GOTCHA-008`

```typescript
// ❌ Phase 1 (cũ)
<TransitionButton currentStatus={f.status.name} ... />

// ✅ Hiện tại
<TransitionButton currentStatus={f.status} ... />  // truyền object đầy đủ
```

---

## [GOTCHA] CommandPalette — đọc recent_issues trong useEffect

**ID:** `GOTCHA-009`

```typescript
// ✅ Đọc trong useEffect khi palette mở
useEffect(() => { setRecent(getRecent()); }, [open]);

// Khi user chọn issue: gọi saveRecent(issue) TRƯỚC khi navigate
```

---

## [GOTCHA] Avatar URL — phải proxy qua backend

**ID:** `GOTCHA-010`

Jira avatar URLs có Authentication header requirement — browser không thể load trực tiếp. Dùng endpoint proxy:

```typescript
// ❌ Trực tiếp (403)
<img src={user.avatarUrls['48x48']} />

// ✅ Qua proxy
<img src={`${API_URL}/api/jira/avatar?url=${encodeURIComponent(avatarUrl)}`} />
```
