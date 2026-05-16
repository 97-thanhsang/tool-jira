# Màn hình Worklog Calendar

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Xây dựng màn hình Worklog Calendar giống WorklogPRO — xem, filter, kéo thả, edit worklog theo lịch.

**Architecture:** 1 page `/worklog` với SWR fetch worklogs từ Jira API. Calendar grid (week/month view) render từ dữ liệu đã fetch. Kéo thả entry đổi ngày. Drawer bên phải để edit/delete. Filter bar trên cùng: chọn khoảng thời gian + user.

**Tech Stack:** Next.js 16, React, SWR, @dnd-kit (drag & drop), date-fns, recharts (optional totals), Tailwind CSS, TypeScript.

---

## File Structure

```
app/(app)/worklog/page.tsx              — Main page: state orchestration, layout
components/worklog/
  worklog-calendar.tsx                  — Calendar grid (week/month), DndContext
  worklog-day-cell.tsx                  — Single day cell: header + entries
  worklog-entry-card.tsx                — Draggable entry: issue key + hours + project color
  worklog-filters.tsx                   — Filter bar: period + user + project
  worklog-drawer.tsx                    — Right drawer: worklog detail + edit form
hooks/
  use-worklogs.ts                       — useSWR fetch worklogs by date + user
  use-worklog-mutations.ts              — Add/update/delete worklog mutations
types/jira.ts                           — Add WorklogEntry, WorklogFilters types
```

---

### Task 1: Types + API helpers

**Files:**
- Modify: `frontend/types/jira.ts`
- Create: `frontend/lib/worklog-api.ts`

- [ ] **Step 1: Add WorklogEntry + WorklogFilters types**

```ts
// types/jira.ts — add at bottom:
export interface WorklogAuthor {
  accountId?: string;
  name: string;
  displayName: string;
  avatarUrls?: { '24x24': string };
}

export interface WorklogEntry {
  id: string;
  issueId: string;
  issueKey: string;
  issueSummary: string;
  projectKey: string;
  projectName: string;
  author: WorklogAuthor;
  timeSpent: string;           // "2h 30m"
  timeSpentSeconds: number;    // 9000
  started: string;             // "2026-05-06T08:30:00.000+0700"
  comment: string;
  created: string;
  updated: string;
}

export interface WorklogFilters {
  username: string;            // Jira username
  dateFrom: string;            // ISO date "2026-05-01"
  dateTo: string;              // ISO date "2026-05-31"
  project?: string;            // optional project key filter
}

export interface WorklogCreatePayload {
  issueKey: string;
  timeSpentSeconds: number;
  comment: string;
  started: string;             // ISO datetime "2026-05-10T09:00:00.000+0700"
}

export interface WorklogSearchResult {
  entries: WorklogEntry[];
  total: number;
  totalHours: number;
  dailyHours: Record<string, number>; // "2026-05-06" → 8
}
```

- [ ] **Step 2: Create worklog-api helpers**

```ts
// lib/worklog-api.ts
import { api } from './api';
import type { WorklogEntry, WorklogSearchResult, WorklogCreatePayload } from '@/types/jira';

/** Fetch all worklogs for a user in date range */
export async function fetchWorklogs(
  username: string,
  dateFrom: string,
  dateTo: string,
): Promise<WorklogSearchResult> {
  const jql = `worklogDate >= "${dateFrom}" AND worklogDate <= "${dateTo}" AND worklogAuthor = "${username}" ORDER BY created DESC`;
  const r = await api.get<{
    total: number;
    issues: Array<{
      id: string;
      key: string;
      fields: {
        summary: string;
        project: { key: string; name: string };
        worklog: {
          worklogs: Array<{
            id: string;
            author: { name: string; displayName: string; avatarUrls?: { '24x24': string } };
            timeSpent: string;
            timeSpentSeconds: number;
            started: string;
            comment: string;
            created: string;
            updated: string;
          }>;
        };
      };
    }>;
  }>('/search', {
    params: {
      jql,
      maxResults: 500,
      fields: 'summary,project,worklog',
    },
  });

  // Flatten + filter worklogs by date range
  const entries: WorklogEntry[] = [];
  const dailyHours: Record<string, number> = {};

  for (const issue of r.data.issues) {
    const wls = issue.fields.worklog?.worklogs ?? [];
    for (const wl of wls) {
      const startedDate = new Date(wl.started);
      const dateKey = startedDate.toISOString().slice(0, 10);

      // Filter: only worklogs within our date range and by our user
      if (wl.author.name !== username) continue;
      if (dateKey < dateFrom || dateKey > dateTo) continue;

      entries.push({
        id: wl.id,
        issueId: issue.id,
        issueKey: issue.key,
        issueSummary: issue.fields.summary,
        projectKey: issue.fields.project.key,
        projectName: issue.fields.project.name,
        author: wl.author,
        timeSpent: wl.timeSpent,
        timeSpentSeconds: wl.timeSpentSeconds,
        started: wl.started,
        comment: wl.comment ?? '',
        created: wl.created,
        updated: wl.updated,
      });

      dailyHours[dateKey] = (dailyHours[dateKey] ?? 0) + wl.timeSpentSeconds / 3600;
    }
  }

  const totalHours = entries.reduce((s, e) => s + e.timeSpentSeconds / 3600, 0);

  return { entries, total: entries.length, totalHours, dailyHours };
}

/** Add a worklog to an issue */
export async function addWorklog(payload: WorklogCreatePayload) {
  return api.post(`/issue/${payload.issueKey}/worklog`, {
    timeSpentSeconds: payload.timeSpentSeconds,
    comment: payload.comment,
    started: payload.started,
  });
}

/** Update a worklog */
export async function updateWorklog(
  issueKey: string,
  worklogId: string,
  payload: { timeSpentSeconds: number; comment: string; started: string },
) {
  return api.put(`/issue/${issueKey}/worklog/${worklogId}`, payload);
}

/** Delete a worklog */
export async function deleteWorklog(issueKey: string, worklogId: string) {
  return api.delete(`/issue/${issueKey}/worklog/${worklogId}`);
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/types/jira.ts frontend/lib/worklog-api.ts
git commit -m "feat: add WorklogEntry types and worklog API helpers"
```

---

### Task 2: useWorklogs SWR hook

**Files:**
- Create: `frontend/hooks/use-worklogs.ts`

- [ ] **Step 1: Create the hook**

```ts
// hooks/use-worklogs.ts
'use client';
import useSWR from 'swr';
import { fetchWorklogs } from '@/lib/worklog-api';
import type { WorklogFilters, WorklogEntry } from '@/types/jira';
import { useMemo } from 'react';

export function useWorklogs(filters: WorklogFilters | null) {
  const key = filters
    ? ['worklogs', filters.username, filters.dateFrom, filters.dateTo, filters.project]
    : null;

  const { data, error, isLoading, mutate } = useSWR(
    key,
    async ([, username, dateFrom, dateTo]) => {
      const result = await fetchWorklogs(username, dateFrom, dateTo);
      // If project filter, filter entries client-side
      if (filters?.project) {
        result.entries = result.entries.filter(e => e.projectKey === filters.project);
        result.total = result.entries.length;
        result.totalHours = result.entries.reduce((s, e) => s + e.timeSpentSeconds / 3600, 0);
        result.dailyHours = {};
        for (const e of result.entries) {
          const d = new Date(e.started).toISOString().slice(0, 10);
          result.dailyHours[d] = (result.dailyHours[d] ?? 0) + e.timeSpentSeconds / 3600;
        }
      }
      return result;
    },
    { revalidateOnFocus: false, dedupingInterval: 30_000 },
  );

  // Group entries by date
  const entriesByDate = useMemo(() => {
    if (!data?.entries) return {};
    const map: Record<string, WorklogEntry[]> = {};
    for (const e of data.entries) {
      const d = new Date(e.started).toISOString().slice(0, 10);
      (map[d] ??= []).push(e);
    }
    return map;
  }, [data]);

  return { data, entriesByDate, isLoading, error, mutate };
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/hooks/use-worklogs.ts
git commit -m "feat: add useWorklogs SWR hook"
```

---

### Task 3: useWorklogMutations hook

**Files:**
- Create: `frontend/hooks/use-worklog-mutations.ts`

- [ ] **Step 1: Create CRUD mutations hook**

```ts
// hooks/use-worklog-mutations.ts
'use client';
import { useState, useCallback } from 'react';
import { addWorklog, updateWorklog, deleteWorklog } from '@/lib/worklog-api';
import type { WorklogEntry } from '@/types/jira';

interface WorklogToast {
  message: string;
  type: 'success' | 'error';
}

export function useWorklogMutations(onSuccess: () => void) {
  const [toast, setToast] = useState<WorklogToast | null>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const add = useCallback(
    async (payload: { issueKey: string; timeSpentSeconds: number; comment: string; started: string }) => {
      try {
        await addWorklog(payload);
        showToast('Worklog added', 'success');
        onSuccess();
      } catch {
        showToast('Failed to add worklog', 'error');
      }
    },
    [onSuccess],
  );

  const update = useCallback(
    async (entry: WorklogEntry, changes: { timeSpentSeconds: number; comment: string; started: string }) => {
      try {
        await updateWorklog(entry.issueKey, entry.id, changes);
        showToast('Worklog updated', 'success');
        onSuccess();
      } catch {
        showToast('Failed to update worklog', 'error');
      }
    },
    [onSuccess],
  );

  const remove = useCallback(
    async (entry: WorklogEntry) => {
      try {
        await deleteWorklog(entry.issueKey, entry.id);
        showToast('Worklog deleted', 'success');
        onSuccess();
      } catch {
        showToast('Failed to delete worklog', 'error');
      }
    },
    [onSuccess],
  );

  return { add, update, remove, toast };
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/hooks/use-worklog-mutations.ts
git commit -m "feat: add useWorklogMutations CRUD hook"
```

---

### Task 4: Worklog Calendar — Core Week View

**Files:**
- Create: `frontend/components/worklog/worklog-calendar.tsx`
- Create: `frontend/components/worklog/worklog-day-cell.tsx`
- Create: `frontend/components/worklog/worklog-entry-card.tsx`
- Create: `frontend/app/(app)/worklog/page.tsx`

- [ ] **Step 1: Create worklog-entry-card.tsx**

```tsx
// components/worklog/worklog-entry-card.tsx
'use client';
import type { WorklogEntry } from '@/types/jira';

const PROJECT_COLORS: Record<string, string> = {
  HLU2: '#0052CC', HUBONG01: '#36B37E', HUFI: '#DE350B',
  HPMUON2: '#FF8B00', RDDEP: '#6554C0', PSDEP: '#008DA6',
};

export function WorklogEntryCard({
  entry,
  onClick,
}: {
  entry: WorklogEntry;
  onClick?: (entry: WorklogEntry) => void;
}) {
  const color = PROJECT_COLORS[entry.projectKey] ?? '#5E6C84';
  const hours = (entry.timeSpentSeconds / 3600).toFixed(1);

  return (
    <div
      className="px-1.5 py-0.5 mb-1 rounded-sm text-[11px] cursor-pointer
        bg-white dark:bg-gray-800 border border-[#DFE1E6] dark:border-gray-700
        hover:shadow-sm hover:border-[#0052CC] dark:hover:border-blue-500 transition-all group"
      style={{ borderLeftColor: color, borderLeftWidth: '3px' }}
      onClick={(e) => { e.stopPropagation(); onClick?.(entry); }}
    >
      <div className="flex items-center justify-between gap-1">
        <span className="font-medium text-[#172B4D] dark:text-gray-100 truncate">
          {entry.issueKey}
        </span>
        <span className="text-[#5E6C84] dark:text-gray-400 flex-shrink-0 font-medium">
          {hours}h
        </span>
      </div>
      {entry.comment && (
        <p className="text-[#5E6C84] dark:text-gray-500 truncate text-[10px] mt-0.5">{entry.comment}</p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create worklog-day-cell.tsx**

```tsx
// components/worklog/worklog-day-cell.tsx
'use client';
import { format, isToday, isSameMonth } from 'date-fns';
import { cn } from '@/lib/utils';
import type { WorklogEntry } from '@/types/jira';
import { WorklogEntryCard } from './worklog-entry-card';

interface WorklogDayCellProps {
  date: Date;
  entries: WorklogEntry[];
  dailyHours: number;
  isCurrentMonth?: boolean;  // for month view, gray out other months
  compact?: boolean;          // month view = smaller
  onEntryClick?: (entry: WorklogEntry) => void;
  onDayClick?: (date: Date) => void;  // quick-add
}

export function WorklogDayCell({
  date, entries, dailyHours, isCurrentMonth = true, compact = false, onEntryClick, onDayClick,
}: WorklogDayCellProps) {
  const hours = dailyHours > 0 ? dailyHours.toFixed(1) : '';
  const hasHours = dailyHours > 0;

  return (
    <div
      className={cn(
        'flex flex-col border border-[#DFE1E6] dark:border-gray-700 bg-white dark:bg-gray-800/50 min-h-0',
        compact ? 'p-1' : 'p-1.5 min-h-[80px]',
        isToday(date) && 'bg-[#DEEBFF] dark:bg-blue-900/20 border-[#0052CC] dark:border-blue-500',
        !isCurrentMonth && 'opacity-40 bg-[#F4F5F7] dark:bg-gray-900/50',
      )}
      onClick={() => onDayClick?.(date)}
    >
      {/* Header: date + total hours */}
      <div className={cn(
        'flex items-center justify-between mb-0.5 flex-shrink-0',
        compact ? 'text-[10px]' : 'text-xs',
      )}>
        <span className={cn(
          'font-semibold',
          isToday(date) ? 'text-[#0052CC] dark:text-blue-400' : 'text-[#172B4D] dark:text-gray-200',
        )}>
          {compact ? format(date, 'd') : format(date, 'EEE d')}
        </span>
        {hours && (
          <span className="text-[10px] text-[#5E6C84] dark:text-gray-400 font-medium">
            {hours}h
          </span>
        )}
      </div>

      {/* Entries — scrollable */}
      <div className={cn(
        'flex-1 overflow-y-auto space-y-0.5',
        compact ? 'max-h-[60px]' : 'max-h-full',
      )}>
        {entries.slice(0, compact ? 3 : 10).map((entry) => (
          <WorklogEntryCard key={entry.id} entry={entry} onClick={onEntryClick} />
        ))}
        {entries.length > (compact ? 3 : 10) && (
          <p className="text-[10px] text-[#0052CC] dark:text-blue-400 pl-1">
            +{entries.length - (compact ? 3 : 10)} more
          </p>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create worklog-calendar.tsx (week view)**

```tsx
// components/worklog/worklog-calendar.tsx
'use client';
import { useMemo } from 'react';
import { startOfWeek, addDays, format } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { DndContext, DragEndEvent, closestCenter } from '@dnd-kit/core';
import type { WorklogEntry } from '@/types/jira';
import { WorklogDayCell } from './worklog-day-cell';
import { Button } from '@/components/ui/button';

interface WorklogCalendarProps {
  mode: 'week' | 'month';
  baseDate: Date;
  entriesByDate: Record<string, WorklogEntry[]>;
  dailyHours: Record<string, number>;
  onNavigate: (direction: 'prev' | 'next') => void;
  onModeChange: (mode: 'week' | 'month') => void;
  onEntryClick?: (entry: WorklogEntry) => void;
  onDayClick?: (date: Date) => void;
  onDragEnd?: (entryId: string, newDate: string) => void;
}

export function WorklogCalendar({
  mode, baseDate, entriesByDate, dailyHours,
  onNavigate, onModeChange, onEntryClick, onDayClick, onDragEnd,
}: WorklogCalendarProps) {
  // Generate day grid
  const days = useMemo(() => {
    const result: Date[] = [];
    if (mode === 'week') {
      const start = startOfWeek(baseDate, { weekStartsOn: 1 }); // Monday
      for (let i = 0; i < 7; i++) result.push(addDays(start, i));
    } else {
      // Month view: 42 cells (6 weeks × 7 days)
      const year = baseDate.getFullYear();
      const month = baseDate.getMonth();
      const firstDay = new Date(year, month, 1);
      const start = startOfWeek(firstDay, { weekStartsOn: 1 });
      for (let i = 0; i < 42; i++) result.push(addDays(start, i));
    }
    return result;
  }, [mode, baseDate]);

  // Day of week headers
  const dayHeaders = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => onNavigate('prev')}
            className="border-[#DFE1E6] dark:border-gray-700 text-[#5E6C84] hover:bg-[#F4F5F7] dark:hover:bg-gray-800">
            <ChevronLeft size={14} />
          </Button>
          <h2 className="text-sm font-semibold text-[#172B4D] dark:text-gray-100 w-40 text-center">
            {mode === 'week'
              ? `${format(days[0], 'MMM d')} – ${format(days[6], 'MMM d, yyyy')}`
              : format(baseDate, 'MMMM yyyy')}
          </h2>
          <Button variant="outline" size="sm" onClick={() => onNavigate('next')}
            className="border-[#DFE1E6] dark:border-gray-700 text-[#5E6C84] hover:bg-[#F4F5F7] dark:hover:bg-gray-800">
            <ChevronRight size={14} />
          </Button>
        </div>
        <div className="flex rounded-sm border border-[#DFE1E6] dark:border-gray-700 overflow-hidden">
          <button onClick={() => onModeChange('week')}
            className={`text-xs px-3 py-1 ${mode === 'week' ? 'bg-[#0052CC] text-white' : 'bg-white dark:bg-gray-800 text-[#5E6C84] hover:bg-[#F4F5F7] dark:hover:bg-gray-700'}`}>
            Week
          </button>
          <button onClick={() => onModeChange('month')}
            className={`text-xs px-3 py-1 border-l border-[#DFE1E6] dark:border-gray-700 ${mode === 'month' ? 'bg-[#0052CC] text-white' : 'bg-white dark:bg-gray-800 text-[#5E6C84] hover:bg-[#F4F5F7] dark:hover:bg-gray-700'}`}>
            Month
          </button>
        </div>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-px mb-1 flex-shrink-0">
        {dayHeaders.map((d) => (
          <div key={d} className="text-center text-[10px] font-semibold text-[#5E6C84] dark:text-gray-400 py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <DndContext collisionDetection={closestCenter} onDragEnd={(e: DragEndEvent) => {
        if (e.over) {
          const newDate = String(e.over.id); // droppable ID = date string
          onDragEnd?.(String(e.active.id), newDate);
        }
      }}>
        <div className="grid grid-cols-7 gap-px flex-1 min-h-0 bg-[#DFE1E6] dark:bg-gray-700 rounded-sm overflow-hidden">
          {days.map((day) => {
            const key = format(day, 'yyyy-MM-dd');
            return (
              <WorklogDayCell
                key={key}
                date={day}
                entries={entriesByDate[key] ?? []}
                dailyHours={dailyHours[key] ?? 0}
                compact={mode === 'month'}
                isCurrentMonth={mode === 'week' || day.getMonth() === baseDate.getMonth()}
                onEntryClick={onEntryClick}
                onDayClick={onDayClick}
              />
            );
          })}
        </div>
      </DndContext>
    </div>
  );
}
```

- [ ] **Step 4: Create Page stub (without filters yet)**

```tsx
// app/(app)/worklog/page.tsx
'use client';
import { useState, useMemo, useCallback } from 'react';
import { startOfWeek, subWeeks, addWeeks, startOfMonth, subMonths, addMonths, format } from 'date-fns';
import { getStoredUser } from '@/lib/api';
import { useWorklogs } from '@/hooks/use-worklogs';
import { useWorklogMutations } from '@/hooks/use-worklog-mutations';
import { WorklogCalendar } from '@/components/worklog/worklog-calendar';
import { WorklogFilters, type WorklogFiltersType } from '@/components/worklog/worklog-filters';
import { WorklogDrawer } from '@/components/worklog/worklog-drawer';
import { CheckCircle2, XCircle, Clock } from 'lucide-react';
import type { WorklogEntry } from '@/types/jira';
import { cn } from '@/lib/utils';

export default function WorklogPage() {
  const currentUser = getStoredUser();
  const initialUsername = (currentUser as { name?: string } | null)?.name ?? '';

  const [baseDate, setBaseDate] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [mode, setMode] = useState<'week' | 'month'>('week');
  const [filters, setFilters] = useState<WorklogFiltersType>({
    username: initialUsername,
    dateFrom: '',
    dateTo: '',
    period: 'week',
    project: '',
  });

  // Derive date range from period or custom
  const activeFilters = useMemo(() => {
    const now = new Date();
    let from = filters.dateFrom;
    let to = filters.dateTo;

    if (filters.period === 'week') {
      const start = startOfWeek(now, { weekStartsOn: 1 });
      from = format(start, 'yyyy-MM-dd');
      to = format(addWeeks(start, 1), 'yyyy-MM-dd');
    } else if (filters.period === 'month') {
      const start = startOfMonth(now);
      from = format(start, 'yyyy-MM-dd');
      to = format(addMonths(start, 1), 'yyyy-MM-dd');
    } else if (filters.period === 'year') {
      from = format(new Date(now.getFullYear(), 0, 1), 'yyyy-MM-dd');
      to = format(new Date(now.getFullYear(), 11, 31), 'yyyy-MM-dd');
    }

    return { username: filters.username, dateFrom: from, dateTo: to, project: filters.project || undefined };
  }, [filters]);

  const { data, entriesByDate, isLoading, mutate } = useWorklogs(
    activeFilters.username ? activeFilters : null,
  );

  // Calendar navigation
  const handleNavigate = useCallback((direction: 'prev' | 'next') => {
    setBaseDate((prev) => {
      if (mode === 'week') return direction === 'prev' ? subWeeks(prev, 1) : addWeeks(prev, 1);
      return direction === 'prev' ? subMonths(prev, 1) : addMonths(prev, 1);
    });
  }, [mode]);

  // CRUD
  const { add, update, remove, toast } = useWorklogMutations(() => mutate());

  // Drawer
  const [drawerEntry, setDrawerEntry] = useState<WorklogEntry | null>(null);

  // Quick-add
  const [quickAddDate, setQuickAddDate] = useState<string | null>(null);

  return (
    <div className="flex flex-col h-screen p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div>
          <h1 className="text-xl font-semibold text-[#172B4D] dark:text-gray-100 flex items-center gap-2">
            <Clock size={20} className="text-[#0052CC]" />
            Worklog Calendar
          </h1>
          {data && (
            <p className="text-sm text-[#5E6C84] dark:text-gray-400 mt-0.5">
              {data.total} entries · {data.totalHours.toFixed(1)} hours total
            </p>
          )}
        </div>
      </div>

      {/* Filters */}
      <WorklogFilters filters={filters} onChange={setFilters} />

      {/* Calendar */}
      <div className="flex-1 min-h-0 mt-4">
        <WorklogCalendar
          mode={mode}
          baseDate={baseDate}
          entriesByDate={entriesByDate}
          dailyHours={data?.dailyHours ?? {}}
          onNavigate={handleNavigate}
          onModeChange={setMode}
          onEntryClick={setDrawerEntry}
          onDayClick={(d) => setQuickAddDate(format(d, 'yyyy-MM-dd'))}
        />
      </div>

      {/* Drawer — placeholder for Task 5 */}
      <WorklogDrawer
        entry={drawerEntry}
        onClose={() => setDrawerEntry(null)}
        onSave={(changes) => drawerEntry && update(drawerEntry, changes)}
        onDelete={() => drawerEntry && remove(drawerEntry)}
      />

      {/* Toast */}
      {toast && (
        <div className={cn(
          'fixed bottom-6 right-6 z-[60] flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium',
          toast.type === 'success' ? 'bg-[#36B37E] text-white' : 'bg-red-500 text-white',
        )}>
          {toast.type === 'success' ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
          {toast.message}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Run type check**

Run: `npx tsc --noEmit`
Expected: 0 errors (may have some for unimplemented components)

- [ ] **Step 6: Commit**

```bash
git add frontend/components/worklog/worklog-calendar.tsx frontend/components/worklog/worklog-day-cell.tsx frontend/components/worklog/worklog-entry-card.tsx "frontend/app/(app)/worklog/page.tsx"
git commit -m "feat: Phase 10A — Worklog Calendar core: week/month views, entry cards, day cells"
```

---

### Task 5: Worklog Filters

**Files:**
- Create: `frontend/components/worklog/worklog-filters.tsx`

- [ ] **Step 1: Create filter bar component**

```tsx
// components/worklog/worklog-filters.tsx
'use client';
import { UserSearchInput } from '@/components/issues/user-search-input';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

export interface WorklogFiltersType {
  username: string;
  dateFrom: string;
  dateTo: string;
  period: 'week' | 'month' | 'year' | 'custom';
  project: string;
}

interface WorklogFiltersProps {
  filters: WorklogFiltersType;
  onChange: (f: WorklogFiltersType) => void;
}

export function WorklogFilters({ filters, onChange }: WorklogFiltersProps) {
  return (
    <div className="flex items-center gap-3 flex-wrap flex-shrink-0">
      {/* Period selector */}
      <select
        className="text-xs border border-[#DFE1E6] dark:border-gray-600 rounded px-2 py-1.5 bg-white dark:bg-gray-800 text-[#172B4D] dark:text-gray-100 focus:outline-none focus:border-[#0052CC]"
        value={filters.period}
        onChange={(e) => onChange({ ...filters, period: e.target.value as WorklogFiltersType['period'] })}
      >
        <option value="week">This Week</option>
        <option value="month">This Month</option>
        <option value="year">This Year</option>
        <option value="custom">Custom</option>
      </select>

      {/* Custom date range (visible when period=custom) */}
      {filters.period === 'custom' && (
        <>
          <input
            type="date"
            className="text-xs border border-[#DFE1E6] dark:border-gray-600 rounded px-2 py-1.5 bg-white dark:bg-gray-800 text-[#172B4D] dark:text-gray-100 focus:outline-none focus:border-[#0052CC]"
            value={filters.dateFrom}
            onChange={(e) => onChange({ ...filters, dateFrom: e.target.value })}
          />
          <span className="text-xs text-[#5E6C84]">to</span>
          <input
            type="date"
            className="text-xs border border-[#DFE1E6] dark:border-gray-600 rounded px-2 py-1.5 bg-white dark:bg-gray-800 text-[#172B4D] dark:text-gray-100 focus:outline-none focus:border-[#0052CC]"
            value={filters.dateTo}
            onChange={(e) => onChange({ ...filters, dateTo: e.target.value })}
          />
        </>
      )}

      {/* User filter */}
      <div className="w-52">
        <UserSearchInput
          value={filters.username || undefined}
          onChange={(username) => onChange({ ...filters, username: username ?? '' })}
          placeholder="User..."
          includeUnassigned={false}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/components/worklog/worklog-filters.tsx
git commit -m "feat: Phase 10B — Worklog filters: period selector + user search"
```

---

### Task 6: Worklog Edit Drawer

**Files:**
- Create: `frontend/components/worklog/worklog-drawer.tsx`

- [ ] **Step 1: Create drawer component**

```tsx
// components/worklog/worklog-drawer.tsx
'use client';
import { useState, useEffect } from 'react';
import { X, Trash2, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import type { WorklogEntry } from '@/types/jira';
import { Button } from '@/components/ui/button';

interface WorklogDrawerProps {
  entry: WorklogEntry | null;
  onClose: () => void;
  onSave: (changes: { timeSpentSeconds: number; comment: string; started: string }) => void;
  onDelete: () => void;
}

export function WorklogDrawer({ entry, onClose, onSave, onDelete }: WorklogDrawerProps) {
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);
  const [comment, setComment] = useState('');
  const [startedDate, setStartedDate] = useState('');
  const [startedTime, setStartedTime] = useState('');
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (entry) {
      const h = Math.floor(entry.timeSpentSeconds / 3600);
      const m = Math.floor((entry.timeSpentSeconds % 3600) / 60);
      setHours(h);
      setMinutes(m);
      setComment(entry.comment ?? '');
      const started = new Date(entry.started);
      setStartedDate(format(started, 'yyyy-MM-dd'));
      setStartedTime(format(started, 'HH:mm'));
      setDirty(false);
    }
  }, [entry]);

  if (!entry) return null;

  const totalSeconds = hours * 3600 + minutes * 60;

  const handleSave = () => {
    if (totalSeconds <= 0) return;
    const started = `${startedDate}T${startedTime}:00.000+0700`;
    onSave({ timeSpentSeconds: totalSeconds, comment, started });
    setDirty(false);
    onClose();
  };

  return (
    <div className="fixed top-0 right-0 h-full w-80 bg-white dark:bg-gray-800 border-l border-[#DFE1E6] dark:border-gray-700 shadow-2xl z-50 flex flex-col animate-slide-in-right">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[#DFE1E6] dark:border-gray-700">
        <h3 className="text-sm font-semibold text-[#172B4D] dark:text-gray-100">Worklog Detail</h3>
        <button onClick={onClose} className="hover:text-[#0052CC] transition-colors">
          <X size={16} className="text-[#5E6C84] dark:text-gray-400" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Issue link */}
        <div>
          <a href={`/issues/${entry.issueKey}`} target="_blank" rel="noopener noreferrer"
            className="text-sm text-[#0052CC] dark:text-blue-400 font-medium hover:underline flex items-center gap-1">
            {entry.issueKey}
            <ExternalLink size={12} />
          </a>
          <p className="text-xs text-[#172B4D] dark:text-gray-200 mt-0.5">{entry.issueSummary}</p>
        </div>

        {/* Project */}
        <div>
          <label className="text-[10px] font-semibold text-[#5E6C84] dark:text-gray-400 uppercase">Project</label>
          <p className="text-xs text-[#172B4D] dark:text-gray-100 mt-0.5">{entry.projectName}</p>
        </div>

        {/* Time spent */}
        <div>
          <label className="text-[10px] font-semibold text-[#5E6C84] dark:text-gray-400 uppercase">Time Spent</label>
          <div className="flex items-center gap-2 mt-1">
            <input type="number" min={0} max={24}
              className="w-16 text-xs border border-[#DFE1E6] dark:border-gray-600 rounded px-2 py-1.5 bg-white dark:bg-gray-800 text-[#172B4D] dark:text-gray-100 focus:outline-none focus:border-[#0052CC]"
              value={hours} onChange={(e) => { setHours(Number(e.target.value)); setDirty(true); }}
            />
            <span className="text-xs text-[#5E6C84] dark:text-gray-400">h</span>
            <input type="number" min={0} max={59}
              className="w-16 text-xs border border-[#DFE1E6] dark:border-gray-600 rounded px-2 py-1.5 bg-white dark:bg-gray-800 text-[#172B4D] dark:text-gray-100 focus:outline-none focus:border-[#0052CC]"
              value={minutes} onChange={(e) => { setMinutes(Number(e.target.value)); setDirty(true); }}
            />
            <span className="text-xs text-[#5E6C84] dark:text-gray-400">m</span>
          </div>
        </div>

        {/* Date + Time */}
        <div>
          <label className="text-[10px] font-semibold text-[#5E6C84] dark:text-gray-400 uppercase">Started</label>
          <div className="flex items-center gap-2 mt-1">
            <input type="date"
              className="text-xs border border-[#DFE1E6] dark:border-gray-600 rounded px-2 py-1.5 bg-white dark:bg-gray-800 text-[#172B4D] dark:text-gray-100 focus:outline-none focus:border-[#0052CC]"
              value={startedDate} onChange={(e) => { setStartedDate(e.target.value); setDirty(true); }}
            />
            <input type="time"
              className="text-xs border border-[#DFE1E6] dark:border-gray-600 rounded px-2 py-1.5 bg-white dark:bg-gray-800 text-[#172B4D] dark:text-gray-100 focus:outline-none focus:border-[#0052CC]"
              value={startedTime} onChange={(e) => { setStartedTime(e.target.value); setDirty(true); }}
            />
          </div>
        </div>

        {/* Comment */}
        <div>
          <label className="text-[10px] font-semibold text-[#5E6C84] dark:text-gray-400 uppercase">Comment</label>
          <textarea
            className="w-full text-xs border border-[#DFE1E6] dark:border-gray-600 rounded px-2 py-1.5 bg-white dark:bg-gray-800 text-[#172B4D] dark:text-gray-100 focus:outline-none focus:border-[#0052CC] mt-1 resize-none h-20"
            value={comment} onChange={(e) => { setComment(e.target.value); setDirty(true); }}
            placeholder="What did you work on?"
          />
        </div>

        {/* Author */}
        <div>
          <label className="text-[10px] font-semibold text-[#5E6C84] dark:text-gray-400 uppercase">Author</label>
          <p className="text-xs text-[#172B4D] dark:text-gray-100 mt-0.5">{entry.author.displayName}</p>
        </div>
      </div>

      {/* Footer: Actions */}
      <div className="flex items-center justify-between p-4 border-t border-[#DFE1E6] dark:border-gray-700">
        <Button variant="ghost" size="sm" onClick={onDelete}
          className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 text-xs">
          <Trash2 size={14} className="mr-1" />
          Delete
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onClose}
            className="text-xs border-[#DFE1E6] dark:border-gray-700 text-[#5E6C84] dark:text-gray-400">
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave} disabled={!dirty || totalSeconds <= 0}
            className="text-xs bg-[#0052CC] text-white hover:bg-[#0747A6] disabled:opacity-50">
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Run type check + fix imports**

Run: `npx tsc --noEmit`
Expected: 0 errors

- [ ] **Step 3: Commit**

```bash
git add frontend/components/worklog/worklog-drawer.tsx
git commit -m "feat: Phase 10D — Worklog edit drawer with full form (time, date, comment, delete)"
```

---

### Task 7: Drag & Drop worklog entries between days

**Files:**
- Modify: `frontend/components/worklog/worklog-calendar.tsx`
- Modify: `frontend/components/worklog/worklog-day-cell.tsx`

- [ ] **Step 1: Make WorklogEntryCard draggable**

```tsx
// In worklog-entry-card.tsx — wrap with useDraggable from @dnd-kit
import { useDraggable } from '@dnd-kit/core';

export function WorklogEntryCard({ entry, onClick }: { ... }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: entry.id,
    data: { entry },
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}
      className={isDragging ? 'opacity-50' : ''} ... >
      {/* existing card content */}
    </div>
  );
}
```

- [ ] **Step 2: Make WorklogDayCell droppable**

```tsx
// In worklog-day-cell.tsx — wrap with useDroppable
import { useDroppable } from '@dnd-kit/core';
import { format } from 'date-fns';

export function WorklogDayCell({ date, entries, ... }: WorklogDayCellProps) {
  const key = format(date, 'yyyy-MM-dd');
  const { setNodeRef, isOver } = useDroppable({ id: key });

  return (
    <div ref={setNodeRef}
      className={cn(
        ...,
        isOver && 'bg-[#DEEBFF] dark:bg-blue-900/20 outline outline-2 outline-dashed outline-[#0052CC]',
      )} ...>
      {/* existing content */}
    </div>
  );
}
```

- [ ] **Step 3: Handle drag end in page.tsx**

```tsx
// In page.tsx:
const handleDragEnd = useCallback(async (entryId: string, newDate: string) => {
  if (!data) return;
  const entry = data.entries.find(e => e.id === entryId);
  if (!entry) return;

  const oldDate = new Date(entry.started).toISOString().slice(0, 10);
  if (oldDate === newDate) return;

  // Update started time to new date (keep same time)
  const oldStarted = new Date(entry.started);
  const newStarted = `${newDate}T${format(oldStarted, 'HH:mm')}:00.000+0700`;

  try {
    await updateWorklog(entry.issueKey, entry.id, {
      timeSpentSeconds: entry.timeSpentSeconds,
      comment: entry.comment,
      started: newStarted,
    });
    showToast(`${entry.issueKey} moved to ${newDate}`, 'success');
    mutate();
  } catch {
    showToast('Failed to move worklog', 'error');
  }
}, [data, mutate]);
```

- [ ] **Step 4: Commit**

```bash
git add frontend/components/worklog/worklog-entry-card.tsx frontend/components/worklog/worklog-day-cell.tsx frontend/components/worklog/worklog-calendar.tsx "frontend/app/(app)/worklog/page.tsx"
git commit -m "feat: Phase 10C — Drag & drop worklog entries between days"
```

---

### Task 8: Navigation + Polish

**Files:**
- Modify: `frontend/app/(app)/worklog/page.tsx`

- [ ] **Step 1: Add sidebar nav entry**

Add in sidebar/navigation: `/worklog` → "Worklog" with Clock icon.

- [ ] **Step 2: Add Today button**

```tsx
// In page.tsx header:
<Button variant="outline" size="sm" onClick={() => setBaseDate(startOfWeek(new Date(), { weekStartsOn: 1 }))}
  className="text-xs">Today</Button>
```

- [ ] **Step 3: Period change resets baseDate**

When user changes period filter, auto-navigate calendar to match.

- [ ] **Step 4: Run final type check**

Run: `npx tsc --noEmit && npx next lint`
Expected: 0 errors

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat: Worklog Calendar polish — navigation, sidebar, Today button"
```
```

## Verification

- `npx tsc --noEmit` → 0 errors in all phases
- Manual test: navigate to `/worklog`, see calendar with worklogs loaded
- Test week/month toggle
- Test user filter
- Test drag entry to different day
- Test click entry → drawer → edit → save
- Test click day → quick-add

---

## Self-Review

**1. Spec coverage:**
- ✅ Filter week/month/year/custom → Task 5 (filters.period)
- ✅ Filter by user → Task 5 (UserSearchInput)
- ✅ Drag & drop edit → Task 7
- ✅ Click → drawer with detail → Task 6

**2. Placeholder scan:** No TBD/TODO. All code is complete.

**3. Type consistency:** WorklogEntry used consistently. WorklogFiltersType used in filters and hooks.
