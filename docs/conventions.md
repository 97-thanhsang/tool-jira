# Conventions — Jira Power

> Coding standards, naming rules, file structure patterns.
> Phải follow khi thêm code mới.
> Cập nhật lần cuối: 2026-05-29

---

## File Naming

| Loại | Convention | Ví dụ |
|------|-----------|-------|
| Page | `page.tsx` | `app/(app)/board/page.tsx` |
| Layout | `layout.tsx` | `app/(app)/layout.tsx` |
| Component | `kebab-case.tsx` | `issue-card.tsx`, `kanban-board.tsx` |
| Hook | `use-kebab-case.ts` | `use-my-issues.ts`, `use-worklogs.ts` |
| Lib utility | `kebab-case.ts` | `worklog-api.ts`, `jira-wiki.ts` |
| Type file | `kebab-case.ts` | `jira.ts` |

---

## Component Export Pattern

```typescript
// ✅ Named export (không dùng default cho components)
export function IssueCard({ issue }: { issue: JiraIssue }) { ... }

// ✅ Props type: inline hoặc interface ngay trên component
interface IssueCardProps { issue: JiraIssue; onClick?: () => void; }
export function IssueCard({ issue, onClick }: IssueCardProps) { ... }

// ❌ Default export cho components
export default function IssueCard() { ... }  // KHÔNG dùng
```

**Ngoại lệ:** Pages (`page.tsx`) dùng `default export` — Next.js yêu cầu.

---

## Client Components

```typescript
// Mọi component dùng hooks, browser APIs, hoặc đọc localStorage → PHẢI có directive
'use client';
import { useState, useEffect } from 'react';

// Hiện tại toàn bộ codebase là client components (không có RSC data fetching)
```

---

## localStorage — QUAN TRỌNG

```typescript
// ❌ NEVER — đọc trong render body → hydration mismatch
const user = getStoredUser();

// ✅ ALWAYS — đọc trong useEffect (sau mount)
const [user, setUser] = useState<JiraUser | null>(null);
useEffect(() => { setUser(getStoredUser()); }, []);

// ✅ HOẶC — guard explicit
if (typeof window !== 'undefined') { ... }
```

---

## API Calls

```typescript
// ✅ Dùng api instance từ lib/api.ts — tự động gắn X-Jira-Auth header
import { api } from '@/lib/api';
const result = await api.get('/search', { params: { jql: '...' } });

// ✅ AI calls — dùng helpers từ lib/ai.ts
import { aiSummarize } from '@/lib/ai';
const { bullets } = await aiSummarize({ issueKey, summary, description });

// ❌ KHÔNG dùng axios trực tiếp hoặc fetch (bỏ qua interceptors)
import axios from 'axios';  // không cần, dùng api instance
```

---

## SWR Hook Pattern

```typescript
// Pattern chuẩn cho hook mới
export function useXxx(param: string) {
  const { data, error, isLoading, mutate } = useSWR(
    param ? `/endpoint/${param}` : null,  // null = skip fetch
    (url) => api.get(url).then(r => r.data),
    { revalidateOnFocus: false, dedupingInterval: 30000 }
  );
  return { data, isLoading, error, mutate };
}

// SWR key phải UNIQUE — dùng tuple nếu cần phân biệt
useSWR(['unique-key', param1, param2], fetcher, options)
```

---

## Tailwind Styling

```typescript
// ✅ Dùng cn() từ lib/utils cho conditional classes
import { cn } from '@/lib/utils';
className={cn('base-class', isActive && 'active-class', variant === 'x' && 'x-class')}

// ✅ Màu Jira: dùng hex literals (không thêm vào config)
className="bg-[#0052CC] text-[#172B4D] border-[#DFE1E6]"

// ❌ Tránh inline style khi có thể dùng Tailwind
style={{ backgroundColor: '#0052CC' }}  // chỉ dùng khi dynamic (e.g. project colors)
```

---

## TypeScript

```typescript
// ✅ Typed mọi thứ
const user: JiraUser = response.data;

// ❌ Cấm tuyệt đối
as any
// @ts-ignore
// @ts-expect-error

// ✅ Import types từ types/jira.ts
import type { JiraIssue, JiraSearchResult } from '@/types/jira';

// ✅ Error handling trong catch
} catch (err: unknown) {
  const error = err as { response?: { status: number; data: unknown } };
}
```

---

## Import Aliases

```typescript
// ✅ Luôn dùng @/ alias (configured trong tsconfig.json)
import { api } from '@/lib/api';
import { StatusBadge } from '@/components/shared/status-badge';
import type { JiraIssue } from '@/types/jira';

// ❌ Relative imports cho cross-directory
import { api } from '../../lib/api';  // KHÔNG dùng
```

---

## Backend Routes

```typescript
// ✅ Express v5: wildcard phải có tên, path là array
router.all('/*path', async (req, res) => {
  const raw = req.params['path'];
  const path = Array.isArray(raw) ? raw.join('/') : (raw ?? '');
  return res.json({ data });
});

// ✅ Async handlers: luôn return res
router.get('/path', async (req, res) => {
  return res.json({ data });
});

// ✅ Error handling: luôn có status + json
return res.status(500).json({ error: 'message' });
```

---

## Docs Update

Sau mỗi thay đổi, cập nhật docs liên quan (xem `AGENTS.md` — Quy tắc cập nhật docs).
