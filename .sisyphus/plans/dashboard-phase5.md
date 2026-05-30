# Dashboard — Phase 5: Performance + Saved Views

## TODOs

- [x] Add lazy loading for off-screen widgets using IntersectionObserver
- [x] Create saved views system (save/load named dashboard configurations)
- [x] Add "Save View" / "Load View" buttons to toolbar
- [x] Quality Gate: tsc --noEmit, next build

---

## Task 1 — Lazy Loading Widgets

### Files
- Create: `components/dashboard/lazy-widget.tsx`
- Modify: `components/dashboard/dashboard-layout.tsx`

### Details
1. Create `LazyWidget` wrapper component:
   - Uses IntersectionObserver to detect visibility
   - Only renders `children` when widget enters viewport
   - Shows placeholder skeleton while off-screen
   - Renders once, stays rendered after first intersection

2. Wrap each `SortableWidget` body content with `LazyWidget`
   - Only first 3 widgets load immediately (above fold)
   - Remaining widgets load on scroll

### Optimization impact
- Before: 10 API calls on mount (my-issues, worklog, recent-activity, due-soon × 2)
- After: First visible widgets load, others load on demand
- Combined with React.memo on widgets to prevent re-renders

---

## Task 2 — Saved Dashboard Views

### Files
- Create: `hooks/use-dashboard-views.ts`
- Create: `components/dashboard/dashboard-views.tsx`
- Modify: `app/(app)/dashboard/page.tsx`

### Details
1. Create `useDashboardViews` hook:
   - `views: { name: string; preset: PresetName; hiddenWidgets: string[] }[]`
   - `activeView: string | null`
   - `saveView(name)`, `loadView(name)`, `deleteView(name)`, `updateView(name, config)`
   - Saved to localStorage key `dashboard_views`

2. Create `DashboardViews` component:
   - Dropdown listing all saved views
   - "Save current as..." with text input
   - "Update saved view"
   - "Delete view"
   - Click view name → load it

3. Wire into page.tsx toolbar:
   - Add DashboardViews between preset switcher and Layout settings

4. Auto-save current configuration when:
   - Preset changes
   - Widgets reordered
   - Widgets hidden/shown

---

## Quality Gates

1. `tsc --noEmit` — zero errors
2. `next build` — success
3. Lazy loading works (verify via DevTools network tab)
4. Saved views persist across reload

## Files Summary

| Action | File |
|--------|------|
| Create | `components/dashboard/lazy-widget.tsx` |
| Create | `hooks/use-dashboard-views.ts` |
| Create | `components/dashboard/dashboard-views.tsx` |
| Modify | `components/dashboard/dashboard-layout.tsx` |
| Modify | `app/(app)/dashboard/page.tsx` |
