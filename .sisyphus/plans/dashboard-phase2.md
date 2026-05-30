# Dashboard — Phase 2: All Widgets + Charts + Presets

## TODOs

- [x] Create `components/dashboard/widget-project-stats.tsx` — recharts horizontal BarChart showing all projects with estimated vs logged hours, progress bars
- [x] Create `components/dashboard/widget-recent-activity.tsx` — list of recently updated issues with status badges and relative timestamps
- [x] Create `components/dashboard/widget-due-soon.tsx` — list of upcoming due dates with overdue highlight, priority indicators, status badges
- [x] Create `components/dashboard/widget-team-overview.tsx` — team member stats table with issue counts and logged hours
- [x] Create `components/dashboard/widget-sprint-progress.tsx` — sprint burndown/completion chart using recharts
- [x] Update `app/(app)/dashboard/page.tsx` — add all new widgets to the grid, wire data from hooks
- [x] Implement layout presets in DashboardLayout — "executive"/"detailed"/"analytics" presets with preset switcher in toolbar
- [x] Quality Gate: tsc --noEmit zero errors, next build success

---

## Goal
Add the remaining 5 widgets to the Dashboard, implement recharts-based visualizations, and wire layout presets so users can switch between different pre-configured dashboard layouts.

---

## Task 1 — Widget: Project Stats (recharts BarChart)

### Files
- Create: `components/dashboard/widget-project-stats.tsx`

### Details
1. Stateless component receiving `{ projects: JiraProject[], issuesByProject: Record<string, JiraIssue[]> }`
2. Uses recharts `<BarChart>` with `<Bar>` for each project:
   - Each bar has two segments: estimated hours (light blue) and logged hours (dark blue)
   - Y-axis: project keys
   - X-axis: hours
   - Legend: "Estimated" / "Logged"
3. Also renders a compact list view below the chart with progress bars (fallback for narrow views)
4. Skeleton loading: placeholder chart area

### Verification
- Chart renders with correct project data
- Responsive (shrinks for narrow columns)
- Loading state works

---

## Task 2 — Widget: Recent Activity

### Files
- Create: `components/dashboard/widget-recent-activity.tsx`

### Details
1. Stateless component receiving `{ items: RecentActivityItem[] }` from `useDashboardData()`
2. Renders a clean list (max 8 items):
   - Each row: issue key link + summary (truncated) + status badge + relative time ("2h ago", "1d ago")
   - Status badge uses existing STATUS_CATEGORY_COLORS (new/indeterminate/done)
   - Click → navigate to `/issues/[key]`
3. Empty state: "No recent activity"
4. Skeleton: 8 placeholder rows

### Verification
- List renders items
- Click navigates to issue detail
- Empty state handles 0 items
- Loading state shows skeleton

---

## Task 3 — Widget: Due Soon

### Files
- Create: `components/dashboard/widget-due-soon.tsx`

### Details
1. Stateless component receiving `{ items: DueSoonItem[] }` from `useDashboardData()`
2. Renders a compact list (max 10 items):
   - Each row: overdue indicator (red dot if overdue) + issue key + summary (truncated) + duedate + priority badge
   - Color coding: overdue = red (#DE350B), due within 2 days = orange (#FF8B00), due within 7 days = blue (#0052CC)
   - Priority shown as colored label (same as board patterns)
3. Header shows: "N overdue / M due this week"
4. Empty state: "No upcoming due dates"
5. Skeleton: 10 placeholder rows

### Verification
- List renders with correct due date colors
- Overdue items highlighted
- Loading state works

---

## Task 4 — Widget: Team Overview

### Files
- Create: `components/dashboard/widget-team-overview.tsx`

### Details
1. Component that fetches team data via `useMyIssues()` grouped by assignee
2. Renders a compact table:
   - Columns: Member (avatar + name), Assigned, Done, Logged Hours
   - Each row shows one team member's stats
3. Alternate approach: use `useTeamDashboard()` hook if available
4. Skeleton: 5 placeholder rows

### Verification
- Team stats display correctly
- Member names show correctly
- Loading state works

---

## Task 5 — Widget: Sprint Progress

### Files
- Create: `components/dashboard/widget-sprint-progress.tsx`

### Details
1. Component that fetches sprint data via `useDashboardData()` sprint JQL
2. Uses recharts `<PieChart>` or a simple donut-like ring showing:
   - Center: "12/20 done" text
   - Colored ring segments: todo (gray), inProgress (blue), done (green)
3. Below ring: breakdown numbers by status
4. If no active sprint: show "No active sprint" message
5. Skeleton: placeholder circle

### Verification
- Sprint data displays correctly
- Empty sprint shows appropriate message
- Loading state works

---

## Task 6 — Wire new widgets into page.tsx

### Files
- Modify: `app/(app)/dashboard/page.tsx`

### Details
1. Import all 5 new widgets
2. Add them to the `widgets` array with appropriate `span` values:
   - `project-stats`: span 3 (full width, large chart)
   - `recent-activity`: span 1
   - `due-soon`: span 1
   - `team-overview`: span 1
   - `sprint-progress`: span 1
3. Pass data from `useDashboardData()` to each widget
4. Update toolbar to include preset switcher

### Verification
- All 8 widgets render in the grid
- Data flows correctly to each widget
- No TypeScript errors

---

## Task 7 — Layout Presets

### Files
- Modify: `components/dashboard/dashboard-layout.tsx`
- Modify: `app/(app)/dashboard/page.tsx`

### Details
1. Add `PresetName = 'executive' | 'detailed' | 'analytics'` type
2. Each preset defines: which widgets are visible + their order + their span
   - `executive`: all 8 widgets, 3-column, compact
   - `detailed`: 5 widgets stacked full-width, larger
   - `analytics`: chart-heavy, project-stats + sprint on top, rest below
3. Add preset dropdown in page toolbar
4. When user rearranges widgets, preset switches to "custom"
5. Save preset to localStorage

### Verification
- Switching presets reorders/shows/hides widgets
- Custom order preserved when switching back
- Preset saved across reload

---

## Quality Gates

1. **TypeScript**: `npx tsc --noEmit` — zero errors
2. **Build**: `next build` — success
3. **Console**: No React key warnings, no duplicate SWR keys
4. **Charts**: recharts renders without errors

## Files Summary

| Action | File |
|--------|------|
| Create | `components/dashboard/widget-project-stats.tsx` |
| Create | `components/dashboard/widget-recent-activity.tsx` |
| Create | `components/dashboard/widget-due-soon.tsx` |
| Create | `components/dashboard/widget-team-overview.tsx` |
| Create | `components/dashboard/widget-sprint-progress.tsx` |
| Modify | `app/(app)/dashboard/page.tsx` |
| Modify | `components/dashboard/dashboard-layout.tsx` |