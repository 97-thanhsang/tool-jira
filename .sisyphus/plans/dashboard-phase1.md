# Dashboard — Phase 1: Core Layout + Data Layer + Foundational Widgets

## TODOs

- [x] Task 1: Add BarChart3 import + Dashboard nav item to sidebar.tsx
- [x] Task 2: Create dashboard-layout.tsx (CSS grid, @dnd-kit drag-drop, localStorage persistence)
- [x] Task 3: Create use-dashboard-data.ts (SWR hooks for my-issues, recent-activity, due-soon)
- [x] Task 4: Create widget-my-issues.tsx (3-bar status chart with counts)
- [x] Task 5: Create widget-worklog.tsx (today/week hours + project breakdown)
- [x] Task 6: Create widget-quick-actions.tsx (4 action buttons 2×2 grid)
- [x] Task 7: Create app/(app)/dashboard/page.tsx (wire all widgets + toolbar)
- [x] Task X: Install recharts via npm
- [x] Quality Gate: tsc --noEmit zero errors, next build success

---

## Goal
Build the Dashboard page (`/dashboard`) with a draggable grid layout, data aggregation hook, and 3 foundational widgets (My Issues, Worklog, Quick Actions). All wiring (sidebar nav, SWR hooks, localStorage persistence) included.

---

## ✅ Task 1 — Page Scaffold & Sidebar Nav [DONE]

### Files
- Created: `app/(app)/dashboard/page.tsx`
- Modified: `components/sidebar.tsx`

### Details
1. Create `app/(app)/dashboard/page.tsx`:
   - `'use client'` page component
   - Top toolbar: title "Dashboard", Team dropdown, Period dropdown, Refresh button, Layout Settings button
   - Import and render `DashboardLayout` (from Task 2)
   - Wrap with `DashboardDataProvider` (from Task 3)

2. Modify `components/sidebar.tsx`:
   - Add nav item `{ label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard }` import `LayoutDashboard` from `lucide-react`
   - Icon import add: `LayoutDashboard`
   - Place after "Board" (index 1) in the `mainNav` array

### Verification
- Sidebar shows "Dashboard" nav item, clicking navigates to `/dashboard`
- Page renders toolbar + empty grid without errors

---

## ✅ Task 2 — Dashboard Layout Engine (drag-drop grid) [DONE]

### Files
- Create: `components/dashboard/dashboard-layout.tsx`

### Details
1. Implement `DashboardLayout` component:
   - Receives `widgets: WidgetConfig[]` prop
   - Each `WidgetConfig = { id: string; visible: boolean; order: number; component: ReactNode }`
   - Renders a CSS Grid (3 columns on xl, 2 on md, 1 on sm)
   - Each widget wrapped in a card container with:
     - Widget header (title bar with drag handle)
     - `@dnd-kit` sortable context for drag-to-reorder
   - Empty state: show nothing (zero widgets hidden) or placeholder

2. Implement saved layout:
   - Read `dashboard_layout` from `localStorage` on mount (in `useEffect`)
   - Write to `localStorage` when user reorders
   - Key: `{ widgetOrder: string[]; hiddenWidgets: string[]; preset: string }`

3. Helper: `getDefaultLayout()` returns default widget order for each preset

4. Preset handling:
   - "executive" (default) — 3-column top row + full-width middle + 2-column bottom
   - "detailed" — full-width widgets stacked vertically
   - "analytics" — chart-heavy top row + full-width project stats
   - User can switch presets via toolbar dropdown
   - After user manually rearranges, preset switches to "custom"

### Verification
- Grid renders 3 responsive columns
- Widgets can be dragged to reorder (using `@dnd-kit/sortable`)
- Layout persists across page reload (localStorage)
- Switching presets reorders widgets accordingly

---

## ✅ Task 3 — Data Aggregation Hook [DONE]

### Files
- Create: `hooks/use-dashboard-data.ts`

### Details
1. Implement `useDashboardData()` hook:
   - Aggregates data from multiple existing SWR hooks:
     - `useMyIssues()` → assigned issue counts per status
     - `useWorklogs()` → today/week worklog hours
     - `useProjects()` → project list
     - `useTeamMembers()` → team member stats
   - Accepts `team` and `period` filter params
   - Returns `{ myIssues, worklog, projects, recentActivity, dueSoon, team, sprint, isLoading, error, refresh }`

2. Each sub-hook:
   - Wraps existing SWR hooks with `dedupingInterval: 30000`
   - `refreshInterval: 60000` for auto-refresh
   - Exposes `mutate()` for manual refresh

3. Implement `useRecentActivity()`:
   - SWR key: `['recent-activity', team]`
   - Fetch `GET /search?jql=assignee=currentUser() AND updated>=-1d ORDER BY updated DESC&maxResults=10`
   - Parse into `{ issueKey, summary, status, updated, projectKey }[]`

4. Implement `useDueSoon()`:
   - SWR key: `['due-soon', team]`
   - Fetch `GET /search?jql=assignee=currentUser() AND duedate<=+7d AND resolution=Unresolved ORDER BY duedate ASC&maxResults=20`
   - Return with `overdue` flag

5. Implement `useSprintProgress()`:
   - Fetch `GET /search?jql=sprint in openSprints() AND assignee=currentUser()`
   - Group by statusCategory → todo/wip/done counts + total estimate

### Verification
- Hook returns data shape (no runtime errors)
- SWR keys are unique (no collision with existing hooks)
- `refresh()` triggers re-fetch on all sub-hooks
- Loading state properly set initially

---

## ✅ Task 4 — Widget: My Issues Summary [DONE]

### Files
- Create: `components/dashboard/widget-my-issues.tsx`

### Details
1. Stateless component receiving `{ todo, inProgress, done, total }` counts
2. Rendering:
   - Left: 3 vertical stacked bars with labels (Todo / In Progress / Done)
     - Each bar: colored bar with height proportional to count
     - Colors: `#5E6C84` (todo/gray), `#0052CC` (wip/blue), `#00875A` (done/green)
     - Count number displayed above/inside each bar
   - Right: "Total" circle/number with label
   - Bottom: quick link "View all issues →" linking to `/issues`
3. Skeleton loading: 3 gray placeholder bars

### Verification
- Renders correct counts
- Loading state shows skeleton
- Link navigates to `/issues`
- Responsive (shrinks gracefully in narrow columns)

---

## ✅ Task 5 — Widget: Worklog Today/This Week [DONE]

### Files
- Create: `components/dashboard/widget-worklog.tsx`

### Details
1. Stateless component receiving `{ todayHours, weekHours, projectBreakdown }`
2. Rendering:
   - Top: Today's hours (large number + label "Today")
   - Below: This week hours (medium number + label "This Week")
   - Bottom: Top 3 projects by hours with mini progress bars
     - Each project: colored dot + name + hours + thin bar
3. Empty state: show "0h" for today/week, no project list
4. Skeleton: 2 placeholder numbers + 3 placeholder bars

### Verification
- Displays today and week hours
- Project breakdown shows correctly
- Loading state works

---

## ✅ Task 6 — Widget: Quick Actions [DONE]

### Files
- Create: `components/dashboard/widget-quick-actions.tsx`

### Details
1. Stateless component with 4 action buttons in a 2×2 grid:
   - 📝 **Create Issue** — onClick calls `onCreateOpen()` prop
   - ⏱ **Log Work** — onClick navigates to `/worklog`
   - 🔍 **JQL Search** — onClick navigates to `/search`
   - 📋 **My Issues** — onClick navigates to `/issues`
2. Each button: icon + label, styled with hover effect
3. Uses existing modal trigger via context or router navigation

### Verification
- All 4 buttons render
- Click actions work (navigate or open modal)
- Responsive layout

---

## ✅ Task 7 — Wire Everything Together [DONE]

### Files
- Modify: `app/(app)/dashboard/page.tsx`

### Details
1. Integrate all components:
   - `useDashboardData()` for data
   - `DashboardLayout` as grid container
   - 3 widgets placed in default positions
   - Toolbar: Team filter, Period filter, Refresh, Layout Settings

2. State management:
   - `team` filter state → passed to `useDashboardData()`
   - `period` filter state → passed
   - `preset` layout state → passed to `DashboardLayout`
   - `isRefreshing` → toggle during refresh

3. Toolbar rendering:
   - Left: "Dashboard" heading
   - Right: Team dropdown, Period dropdown, Refresh button, Layout preset switcher

### Verification
- Full page renders without errors
- Data flows from hooks → widgets correctly
- Toolbar filters work
- Refresh button triggers re-fetch

---

## Quality Gates

1. **TypeScript**: `npx tsc --noEmit` — zero errors
2. **Lint**: `next lint` (or ESLint) — zero warnings
3. **Build**: `npm run build` — success
4. **Console**: No React key warnings, no duplicate SWR keys, no hydration mismatches
5. **localStorage**: All reads/writes in `useEffect` only — no render body access

## Files Summary

| Action | File |
|--------|------|
| Create | `app/(app)/dashboard/page.tsx` |
| Create | `components/dashboard/dashboard-layout.tsx` |
| Create | `components/dashboard/widget-my-issues.tsx` |
| Create | `components/dashboard/widget-worklog.tsx` |
| Create | `components/dashboard/widget-quick-actions.tsx` |
| Create | `hooks/use-dashboard-data.ts` |
| Modify | `components/sidebar.tsx` |
| Install | `recharts` (npm) — prep for Phase 2 |

## Notes
- Phase 2 will add: Project Stats (recharts BarChart), Recent Activity, Due Soon, Team Overview, Sprint
- Phase 3 will add: Layout Settings panel, show/hide toggles, preset management
- `recharts` is installed in Phase 1 to avoid dependency issues during build, but only used starting Phase 2
- No new backend routes needed — all data comes from existing Jira API proxy
