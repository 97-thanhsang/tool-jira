# Known Issues & Gotchas — Tool-Jira

> Bugs đã fix và lessons learned. Đọc trước khi debug hoặc thêm tính năng mới.
> Cập nhật lần cuối: 2026-05-10

---

## [FIXED] Hydration Warning — Browser Extension injects className vào `<html>`

**ID:** `BUG-003`
**Ngày fix:** 2026-05-10
**Severity:** Low — chỉ là warning, không ảnh hưởng chức năng

### Triệu chứng
```
A tree hydrated but some attributes of the server rendered HTML didn't match the client.
<html className="mdl-js"  ← extension inject trước React hydrate
```

### Root Cause
Browser extension (Material Design Lite hoặc tương tự) inject `class="mdl-js"` vào `<html>` tag trước khi React hydrate. Code hoàn toàn sạch — đây là false positive.

### Fix Applied
File: `app/layout.tsx`
```tsx
<html lang="en" suppressHydrationWarning>
```
`suppressHydrationWarning` chỉ suppress warning ở chính node đó (không affect children) — an toàn để dùng ở `<html>` root vì đây là nơi duy nhất extension có thể inject.

---

## [FIXED] Express v5 Wildcard Breaking Change

**ID:** `BUG-001`
**Ngày fix:** 2026-05-09
**Severity:** Critical — backend không khởi động được

### Triệu chứng
```
TypeError: Missing parameter name at 1
path-to-regexp error khi start backend
```

### Root Cause
Express v5 dùng `path-to-regexp` v8 — wildcards phải có tên:

```typescript
// ❌ Express v4 (KHÔNG DÙNG)
router.all('/*', handler)
req.params[0]  // undefined

// ✅ Express v5 (ĐÚNG)
router.all('/*path', handler)
req.params['path']  // works
```

### Fix Applied
File: `backend/src/routes/jira.ts`
```typescript
router.all('/*path', async (req: Request, res: Response) => {
  const jiraPath = req.params['path'] ?? '';
  ...
});
```

---

## [FIXED] Hydration Mismatch — Sidebar localStorage

**ID:** `BUG-002`
**Ngày fix:** 2026-05-10
**Severity:** High — console error + UI flicker sau login

### Triệu chứng
```
Hydration failed because the server rendered text didn't match the client.
```

### Root Cause
`Sidebar` component đọc `getStoredUser()` trực tiếp trong render body.
- SSR: `localStorage` không tồn tại → trả `null` → render "User"
- Client: `localStorage` có data → render tên thật → MISMATCH

### Fix Applied
File: `components/sidebar.tsx`
```typescript
// ❌ Before
const user = getStoredUser();  // đọc trong render

// ✅ After
const [user, setUser] = useState(null);
useEffect(() => { setUser(getStoredUser()); }, []);  // đọc sau mount
```

### Nguyên tắc tổng quát
**Bất kỳ component nào đọc `localStorage`/`sessionStorage`/`window.*` đều phải dùng `useEffect`.** Không được đọc trong render body.

---

## [GOTCHA] shadcn/ui dùng @base-ui/react (không phải Radix)

**ID:** `GOTCHA-001`

Dự án này dùng `@base-ui/react` thay vì Radix UI (default của shadcn docs).

```typescript
// ❌ Radix syntax (copy từ shadcn docs → KHÔNG dùng)
<TooltipProvider delayDuration={300}>
<DropdownMenuTrigger asChild>
<DialogTrigger asChild>

// ✅ base-ui syntax
<TooltipProvider delay={300}>
<DropdownMenuTrigger>   // không có asChild
<DialogTrigger>          // không có asChild
```

Khi thêm shadcn component mới: check API của `@base-ui/react`, không dùng Radix docs.

---

## [GOTCHA] Jira API v2 response structure

**ID:** `GOTCHA-002`

Một số field Jira trả về có thể null dù TypeScript type không mark optional:

```typescript
// Fields có thể null trong thực tế:
issue.fields.description    // null nếu không có mô tả
issue.fields.assignee       // null nếu unassigned
issue.fields.parent         // undefined nếu không có parent
issue.fields.comment        // undefined nếu không request field này

// Luôn guard trước khi dùng:
issue.fields.description ?? ''
issue.fields.assignee?.displayName ?? 'Unassigned'
```

---

## [GOTCHA] Next.js params trong App Router

**ID:** `GOTCHA-003`

Trong Next.js 14 App Router, `params` từ dynamic routes là Promise (async):

```typescript
// ✅ Page component cần await params
export default async function IssuePage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const { key } = await params;
  ...
}

// Hoặc nếu là Client Component:
const params = use(paramsPromise);
```

---

## [GOTCHA] SWR và auth header timing

**ID:** `GOTCHA-004`

SWR cache key là URL string. Nếu user logout rồi login lại với account khác, SWR có thể trả stale data của user cũ.

**Workaround hiện tại:** Dùng `router.replace('/board')` sau login, Next.js unmount + remount components → SWR reset.

**Fix đúng (future):** Thêm username vào SWR key: `/search?user=${username}`.

---

## Template — Thêm bug mới

```markdown
## [FIXED/KNOWN/GOTCHA] Tên vấn đề

**ID:** `BUG-XXX` hoặc `GOTCHA-XXX`
**Ngày:** YYYY-MM-DD
**Severity:** Critical / High / Medium / Low

### Triệu chứng
(mô tả lỗi thấy được)

### Root Cause
(nguyên nhân gốc)

### Fix Applied / Workaround
(code fix hoặc workaround)
```

---

## [GOTCHA] SWR key collision khi nhiều hooks dùng cùng endpoint

**ID:** `GOTCHA-005`
**Ngày phát hiện:** 2026-05-10

`useMyIssues` và `useIssuesList` đều gọi `/search` nhưng với params khác nhau. Nếu dùng cùng SWR key `/search`, cache bị share → data sai.

**Fix:** Mỗi hook dùng SWR key riêng:
- `use-my-issues.ts` → key `/search`
- `use-issues-list.ts` → key `/search-issues-list`
- `use-search.ts` → key tuple `['search-palette', query]`

---

## [GOTCHA] TransitionButton — API thay đổi từ string sang JiraStatus object

**ID:** `GOTCHA-006`
**Ngày:** 2026-05-10

Phase 2.4 đổi prop `currentStatus` từ `string` sang `JiraStatus` để có thể color-code badge:

```typescript
// ❌ Phase 1 (cũ)
<TransitionButton currentStatus={f.status.name} ... />

// ✅ Phase 2 (mới)
<TransitionButton currentStatus={f.status} ... />
```

Call site phải truyền object đầy đủ, không chỉ `.name`.

---

## [GOTCHA] localStorage trong CommandPalette — recent issues

**ID:** `GOTCHA-007`
**Ngày:** 2026-05-10

`CommandPalette` đọc `recent_issues` từ localStorage chỉ trong `useEffect(() => { setRecent(getRecent()); }, [open])`. Không được đọc trong render body (SSR sẽ crash).

Khi user chọn một issue: gọi `saveRecent(issue)` → ghi vào localStorage TRƯỚC khi navigate.
