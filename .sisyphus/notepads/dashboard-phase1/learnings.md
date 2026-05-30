# Dashboard Phase 1 — Learnings

## 2026-05-30 — Session ses_1bf67d1c6ffedpp9FhHfqXbCOe

### Architecture Decisions
- **Data aggregation**: Created single `use-dashboard-data.ts` hook that fetches 3 independent SWR queries (my-issues, recent-activity, due-soon) under unique keys to avoid cache collision
- **Layout**: Used CSS Grid with @dnd-kit/rectSortingStrategy (already in deps) for drag-to-reorder. Saved order to localStorage key `dashboard_layout_order`
- **WidgetWorklog**: Uses useWorklogs() with dateFrom/dateTo for this week. WorklogEntry data comes from existing worklog API hooks

### What Works
- All 7 files create/modify, TypeScript zero errors, build passes
- Sidebar: Dashboard nav item with BarChart3 icon between Board and Issues
- Dashboard page at `/dashboard` with toolbar + 3 draggable widgets
- Auto-refresh 60s + manual Refresh button

### Known Gaps (for Phase 2)
- RecentActivity and DueSoon data ALREADY FETCHED in use-dashboard-data but no UI widgets yet
- Project Stats recharts BarChart not yet implemented (recharts installed)
- Team Overview, Sprint Progress widgets not yet created
- Layout presets (executive/detailed/analytics) not yet wired to toolbar
- hide/show toggle panel not yet created

### Conventions Followed
- All files use `'use client'` directive
- SWR hooks follow existing pattern (revalidateOnFocus:false, dedupingInterval:30000)
- Imports use `@/` alias
- Components use named exports (pages use default export)
- localStorage reads in useEffect only (no render body access)
