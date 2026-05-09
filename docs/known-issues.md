# Known Issues & Gotchas — Tool-Jira

> Bugs đã fix và lessons learned. Đọc trước khi debug hoặc thêm tính năng mới.
> Cập nhật lần cuối: 2026-05-10

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
