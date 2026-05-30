# Dashboard — Phase 4: Filters, Export, New Widgets

## TODOs

- [x] Add filter toolbar to page with Team Group, Period, Project selectors
- [x] Refactor useDashboardData to accept filter params (team, period)
- [x] Create widget-issue-types.tsx — PieChart breakdown by issue type
- [x] Create widget-priority.tsx — donut chart breakdown by priority
- [x] Add export button — print-friendly CSS for PDF/screenshot
- [x] Wire all filters into data hooks + widgets
- [x] Quality Gate: tsc --noEmit, next build

---

## Task 1 — Filter Toolbar

### Files
- Modify: `app/(app)/dashboard/page.tsx`
- Create: `components/dashboard/dashboard-filters.tsx`

### Details
1. Create `DashboardFilters` component with 3 dropdowns:
   - **Team Group**: dropdown with team options (All, R&D-X, Tower-1, etc.) — reuse `GROUP_OPTIONS` from team-constants
   - **Period**: dropdown (Today, This Week, This Month, Custom)
   - **Project**: multi-select filter (from useProjects data)
2. Props: `{ team, period, project, onTeamChange, onPeriodChange, onProjectChange }`
3. Place in toolbar between title and right-side controls

### States
- All filters default to "All" or current period
- Period "Custom" opens a date range picker (simple two-date input)
- Project filter: dropdown with search + checkboxes (max 10 visible)

---

## Task 2 — Refactor data hooks for filters

### Files
- Modify: `hooks/use-dashboard-data.ts`

### Details
1. Accept `filters: { team?: string; period?: string; project?: string; dateFrom?: string; dateTo?: string }`
2. Modify JQL queries:
   - `myIssues`: `assignee = currentUser()` → if team, use `assignee in (teamMembers())` or currentUser only
   - `recentActivity`: add `AND updated >= {dateFrom}`
   - `dueSoon`: add `AND project = {project}` if project filter active
3. Pass filter-dependent SWR keys to avoid stale cache
4. Re-fetch data when filters change (SWR auto handles via key change)

---

## Task 3 — New Widget: Issue Type Breakdown

### Files
- Create: `components/dashboard/widget-issue-types.tsx`

### Details
1. PieChart (recharts) showing breakdown by issue type (Story, Task, Bug, Sub-task, etc.)
2. Props: `{ issues?: JiraIssue[]; isLoading?: boolean }`
3. Aggregates: counts per issue type from issues array
4. Color palette per type:
   - Story: #36B37E, Task: #4BADE8, Bug: #DE350B, Sub-task: #0052CC, Epic: #904EE2, Other: #6554C0
5. Renders: donut chart with legend below showing type name + count
6. Center text: total count

---

## Task 4 — New Widget: Priority Distribution

### Files
- Create: `components/dashboard/widget-priority.tsx`

### Details
1. Horizontal bar chart (recharts) showing distribution by priority
2. Props: `{ issues?: JiraIssue[]; isLoading?: boolean }`
3. Aggregates: counts per priority level
4. Bars colored: Highest=#DE350B, High=#FF5630, Medium=#FFAB00, Low=#2684FF, Lowest=#2684FF
5. Y-axis: priority name, X-axis: count

---

## Task 5 — Export Button

### Files
- Create: `components/dashboard/export-button.tsx`

### Details
1. Button with dropdown: "Export as PDF", "Print"
2. For PDF: use `window.print()` with `@media print` CSS
3. Add print styles in page layout: hide sidebar, toolbar, only show widget content
4. For Print: just `window.print()` with appropriate print CSS

---

## Task 6 — Wire filters into page.tsx

### Files
- Modify: `app/(app)/dashboard/page.tsx`

### Details
1. Add filter state: `{ team, period, project, dateFrom, dateTo }`
2. Pass filters to `useDashboardData(filters)`
3. Pass filtered data to all widgets
4. Add `DashboardFilters` component to toolbar
5. Add `ExportButton` to toolbar
6. Add print CSS styles

---

## Quality Gates

1. `tsc --noEmit` — zero errors
2. `next build` — success
3. Filters change triggers widget data refresh
4. Export button works (opens print dialog)

## Files Summary

| Action | File |
|--------|------|
| Create | `components/dashboard/dashboard-filters.tsx` |
| Create | `components/dashboard/widget-issue-types.tsx` |
| Create | `components/dashboard/widget-priority.tsx` |
| Create | `components/dashboard/export-button.tsx` |
| Modify | `hooks/use-dashboard-data.ts` |
| Modify | `app/(app)/dashboard/page.tsx` |
