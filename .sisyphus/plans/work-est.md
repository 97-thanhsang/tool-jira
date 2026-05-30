# Work-Est Plan — Work Estimate & Schedule Tool

> **Plan created:** 2026-05-31 | **Branch:** main | **Session:** ses_1bf67d1c6ffedpp9FhHfqXbCOe

## Overview

New tool page `/work-est` for bulk-setting `originalEstimate` + `duedate` on Jira sub-tasks.
Mirrors the Worklog page UI pattern: calendar daily view showing allocated estimates per day.

## Core Flow

```
[Step 1] Select parent tasks (Jira URL input or search list)
    ↓
[Step 2] Load all sub-tasks — show table with current est, duedate, assignee
    ↓
[Step 3] Set date range (from → to), exclude weekends option
    ↓
[Step 4] Auto-distribute 8h/day across selected sub-tasks:
          → Fill each day with max 8h, sorted by priority/duedate
          → Sub-tasks without estimate get evenly divided remaining hours
          → Sub-tasks with existing estimate keep their estimate
    ↓
[Step 5] Calendar daily view (like Worklog) showing allocated estimates
    ↓
[Step 6] "Apply to Jira" → PUT /issue/{key} updating timetracking + duedate
```

## TODOs

### Phase 1: Foundation — API layer + data loading

- [x] Task 1.1: Create `lib/work-est-api.ts` — fetch sub-tasks from parent issues via JQL
  - Accept: array of parent issue keys
  - Build JQL: `issuekey in (subtaskKeys)` or `parent IN (parentKeys)`
  - Return: sub-task list with key, summary, issuetype, status, priority, assignee, parent, timetracking, duedate
  - Batch-fetch parent issue details (status, estimate, duedate) for context display
  - Export: `fetchSubTasks(parentKeys: string[])`, `batchUpdateEstimate(updates: Array<{key, estimateSeconds, duedate}>)`

- [x] Task 1.2: Create `hooks/use-work-est.ts` — SWR hook for sub-task data
  - Load sub-tasks via `lib/work-est-api.ts`
  - Manage local state: selected sub-tasks (checkbox), manual estimate overrides, date range
  - Compute: daily allocation map after distribution
  - Return: { subTasks, selectedIds, toggleSelection, dateRange, setDateRange, allocations, distribute }

### Phase 2: Core UI — Task Selector + Sub-Task Table

- [x] Task 2.1: Create `components/work-est/est-task-selector.tsx`
  - Input field for Jira issue URL/key (like "EMSPRO2-7288")
  - On enter: validate key, add to selected parent list as chips/ badges
  - Show list of added parents with remove button
  - "Load Sub-Tasks" button → triggers data fetch

- [x] Task 2.2: Create `components/work-est/est-sub-task-table.tsx`
  - Table columns: ☑ | Key | Summary | Issuetype icon | Current Est | Current Duedate | Assignee | Parent
  - Checkbox for selecting sub-tasks to include in distribution
  - "Select All" / "Deselect All" header
  - Summary row: total selected tasks, total est hours
  - Editable "Est" column: inline number input (hours) for manual override

- [x] Task 2.3: Create `components/work-est/est-date-range.tsx`
  - Two date inputs: From / To
  - "Exclude weekends" toggle
  - Auto-calculate working days, total available hours display

### Phase 3: Distribution Algorithm + Calendar View

- [x] Task 3.1: Create `components/work-est/est-distribute-button.tsx`
  - "Distribute" button — triggers algorithm on selected sub-tasks
  - Distribution algorithm (pure function in lib):
    ```
    1. Filter working days (exclude weekends if toggled)
    2. Total available = workingDays * 8 * 3600 (seconds)
    3. Sub-tasks WITH estimate → use existing value
    4. Sub-tasks WITHOUT estimate → divide remaining equally
    5. Sort sub-tasks by: priority DESC, then duedate ASC, then key
    6. Fill each day: 8h cap, carry overflow to next day
    7. Return: Map<date-string, Array<{issueKey, hours, estimateSeconds}>>
    ```
  - Button disabled state when no tasks selected or no date range

- [x] Task 3.2: Create `components/work-est/est-calendar.tsx`
  - Daily view layout like WorklogCalendar (date headers, rows per sub-task)
  - Each day cell: list of sub-tasks allocated, each showing hours
  - Color coding by project or status
  - Daily total header: allocated hours / 8h
  - Empty day: show available capacity

### Phase 4: Apply + Integration

- [x] Task 4.1: Create `components/work-est/est-apply-button.tsx`
  - "Apply to Jira" button — sends PUT to /issue/{key} for each scheduled sub-task
  - Payload: `{ fields: { timetracking: { originalEstimate: "8h" }, duedate: "2026-06-01" } }`
  - Progress indicator: "Updating 3/12..."
  - Success/error toast notifications
  - Batch in chunks of 10 parallel requests

- [x] Task 4.2: Create `app/(app)/work-est/page.tsx` — assemble all components
  - Header: page title "Work Estimate Schedule"
  - Layout: Task Selector (top) → Sub-Task Table (middle) → Date Range + Distribute (toolbar) → Calendar (bottom)
  - Apply button in toolbar
  - Loading states, error handling
  - Follow existing page pattern (useSWR, 'use client', filters state)

- [x] Task 4.3: Add sidebar link — `components/sidebar.tsx`
  - Add `CalendarRange` icon menu item
  - Label: "Work Est" (Vietnamese?) or "Kế hoạch"
  - Route: `/work-est`

### Phase 5: Quality Gate

- [x] Task 5.1: TypeScript check — `npx tsc --noEmit` zero errors
- [x] Task 5.2: Build check — `npx next build` success
- [x] Task 5.3: All 15 routes intact after build
- [x] Task 5.4: Manual review — verify API payload structure, date handling, edge cases

## Files

| File | Purpose |
|------|---------|
| `app/(app)/work-est/page.tsx` | New page |
| `hooks/use-work-est.ts` | SWR data + state management |
| `lib/work-est-api.ts` | Jira API: fetch sub-tasks, batch update |
| `components/work-est/est-task-selector.tsx` | Parent task input |
| `components/work-est/est-sub-task-table.tsx` | Sub-task list + editing |
| `components/work-est/est-date-range.tsx` | Date range picker |
| `components/work-est/est-distribute-button.tsx` | Trigger distribution |
| `components/work-est/est-calendar.tsx` | Daily calendar view |
| `components/work-est/est-apply-button.tsx` | Push to Jira |
| `components/sidebar.tsx` | Add nav link (edit) |

## Distribution Algorithm — Detailed

```
function distribute(subTasks, fromDate, toDate, excludeWeekends):
  // 1. Build working day list
  workingDays = []
  d = fromDate
  while d <= toDate:
    if not (excludeWeekends AND (d is Saturday OR Sunday)):
      workingDays.push(d)
    d = addDays(d, 1)

  // 2. Capacity
  dailyCap = 8 * 3600  // 8h in seconds
  totalCap = workingDays.length * dailyCap

  // 3. Assign estimates
  for each subTask:
    if subTask.manualOverride:
      subTask.assignedSeconds = subTask.manualOverride * 3600
    else if subTask.originalEstimateSeconds > 0:
      subTask.assignedSeconds = subTask.originalEstimateSeconds
    else:
      subTask.assignedSeconds = 0  // placeholder

  // 4. Evenly split remaining capacity to tasks without estimate
  unassignedTasks = subTasks.filter(t => t.assignedSeconds === 0)
  assignedTotal = sum(subTasks.map(t => t.assignedSeconds))
  remaining = totalCap - assignedTotal

  if unassignedTasks.length > 0 AND remaining > 0:
    perTask = floor(remaining / unassignedTasks.length)
    extra = remaining % unassignedTasks.length
    for i, task in unassignedTasks:
      task.assignedSeconds = perTask + (i < extra ? 3600 : 0)

  // 5. Sort sub-tasks
  sorted = subTasks.sort by:
    priority DESC (Highest > High > Medium > Low > Lowest)
    duedate ASC (earliest first)
    key ASC

  // 6. Fill calendar
  schedule = {}  // date → [{issueKey, hours}]
  dayIndex = 0
  carryOver = 0

  for each task in sorted:
    remaining = task.assignedSeconds
    while remaining > 0 AND dayIndex < workingDays.length:
      day = workingDays[dayIndex]
      usedToday = sum(schedule[day]?.map(i => i.seconds) ?? [])
      available = dailyCap - usedToday
      alloc = min(remaining, available)
      if alloc > 0:
        schedule[day] = (schedule[day] ?? []).push({
          issueKey: task.key,
          seconds: alloc,
          hours: alloc / 3600
        })
        remaining -= alloc
      if usedToday + alloc >= dailyCap:
        dayIndex++
    // Set duedate = last day where this task has allocation

  return { schedule, workingDays, allocations: sorted }
```

## Conventions

- All files kebab-case
- Imports: `@/lib/*`, `@/hooks/*`, `@/components/*`, `@/types/jira`
- SWR for data fetching, useState for UI state
- No new BE route needed (Jira proxy handles PUT)
- Follow Worklog page pattern (FilterBar, calendar layout, date-fns)
- Vietnamese labels on UI
