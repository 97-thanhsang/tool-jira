# Conventions — Tool-Jira

> Coding standards, naming rules, file structure patterns.
> AI PHẢI follow conventions này khi thêm code mới.
> Cập nhật lần cuối: 2026-05-10

---

## File Naming

| Loại | Convention | Ví dụ |
|------|-----------|-------|
| Page | `page.tsx` | `app/(app)/board/page.tsx` |
| Layout | `layout.tsx` | `app/(app)/layout.tsx` |
| Component | `kebab-case.tsx` | `issue-card.tsx`, `kanban-board.tsx` |
| Hook | `use-kebab-case.ts` | `use-my-issues.ts`, `use-issue.ts` |
| Lib utility | `kebab-case.ts` | `jira-wiki.ts`, `api.ts` |
| Type file | `kebab-case.ts` | `jira.ts` |

---

## Component Conventions

```typescript
// ✅ Named export (không dùng default export cho components)
export function IssueCard({ issue }: { issue: JiraIssue }) { ... }

// ✅ Props type inline hoặc interface đặt ngay trên component
interface IssueCardProps { issue: JiraIssue; onClick?: () => void; }
export function IssueCard({ issue, onClick }: IssueCardProps) { ... }

// ❌ Default export cho components
export default function IssueCard() { ... }  // không dùng
```

**Ngoại lệ:** Pages dùng `default export` (Next.js yêu cầu).

---

## Client vs Server Components

```typescript
// Mọi component dùng hooks/browser APIs → PHẢI có 'use client'
'use client';
import { useState, useEffect } from 'react';

// Server Components (không có hooks): không cần directive
// Hiện tại hầu hết là Client Components vì cần auth check
```

---

## localStorage Rules (QUAN TRỌNG)

```typescript
// ❌ NEVER — đọc localStorage trong render body
const user = getStoredUser();  // gây hydration mismatch

// ✅ ALWAYS — đọc trong useEffect
const [user, setUser] = useState(null);
useEffect(() => { setUser(getStoredUser()); }, []);
```

---

## API Calls

```typescript
// ✅ Dùng api instance từ lib/api.ts (tự động gắn auth header)
import { api } from '@/lib/api';
const result = await api.get('/search', { params: { jql: '...' } });

// ❌ Không dùng axios trực tiếp hoặc fetch
import axios from 'axios';  // không cần, dùng api instance
```

---

## SWR Hooks Pattern

```typescript
// Pattern chuẩn cho mọi hook mới
export function useXxx(param: string) {
  const { data, error, isLoading, mutate } = useSWR(
    param ? `/endpoint/${param}` : null,  // null = không fetch
    (url) => api.get(url).then(r => r.data),
    { revalidateOnFocus: false, dedupingInterval: 30000 }
  );

  return { data, isLoading, error, mutate };
}
```

---

## Tailwind Styling

```typescript
// ✅ Dùng cn() từ lib/utils cho conditional classes
import { cn } from '@/lib/utils';
className={cn('base-class', isActive && 'active-class', variant === 'x' && 'x-class')}

// ✅ Màu sắc: dùng hex literals cho Jira colors (không hardcode vào tailwind.config)
className="bg-[#0052CC] text-[#172B4D]"

// ❌ Không inline style object khi có thể dùng Tailwind
style={{ backgroundColor: '#0052CC' }}  // tránh khi có thể
```

---

## TypeScript

```typescript
// ✅ Typed mọi thứ, không dùng any
const user: JiraUser = response.data;

// ❌ Cấm tuyệt đối
as any
// @ts-ignore
// @ts-expect-error

// ✅ Khi type Jira response: dùng types từ types/jira.ts
import type { JiraIssue, JiraSearchResult } from '@/types/jira';

// ✅ Catch errors: cast đúng cách
} catch (err: unknown) {
  const error = err as { response?: { status: number; data: unknown } };
}
```

---

## Import Aliases

```typescript
// ✅ Dùng @/ alias (configured trong tsconfig.json)
import { api } from '@/lib/api';
import { StatusBadge } from '@/components/shared/status-badge';
import type { JiraIssue } from '@/types/jira';

// ❌ Relative imports cho cross-directory
import { api } from '../../lib/api';
```

---

## Backend Routes

```typescript
// ✅ Express v5: wildcard phải có tên
router.all('/*path', handler)
req.params['path']

// ✅ Async handlers: return res để TypeScript satisfied
router.get('/path', async (req, res) => {
  return res.json({ data });
});

// ✅ Error handling: luôn return status + json
return res.status(500).json({ error: 'message' });
```

---

## Docs Update Rule

Sau mỗi thay đổi, AI PHẢI cập nhật docs liên quan:

| Thay đổi | Docs cần update |
|---------|----------------|
| Thêm component | `docs/frontend.md` — Component Map |
| Thêm hook | `docs/frontend.md` — Hooks section |
| Thêm page | `docs/frontend.md` — Route Structure |
| Thêm API route BE | `docs/backend.md` |
| Thay đổi auth/data flow | `docs/data-flow.md` |
| Fix bug | `docs/known-issues.md` |
| Feature xong | `docs/roadmap.md` — đánh ✅ + cập nhật Changelog |
| Convention mới | `docs/conventions.md` |
