# Dashboard — Phase 3: Layout Customization + Presets

## TODOs

- [x] Add layout presets dropdown to page toolbar (executive / detailed / analytics)
- [x] Implement preset logic in DashboardLayout — widget visibility + span per preset
- [x] Create settings panel component (toggle widgets on/off)
- [x] Integrate settings panel into page toolbar as a popover/modal
- [x] Quality Gate: tsc --noEmit, next build

---

## Goal
Give users full control over their Dashboard layout: switch between pre-configured presets, show/hide individual widgets, and persist preferences in localStorage.

---

## Task 1 — Preset definitions + switcher

### Files
- Modify: `components/dashboard/dashboard-layout.tsx`
- Modify: `app/(app)/dashboard/page.tsx`

### Preset definitions
Three presets, each defining: which widgets are visible, their order, and their span:

```
executive (default):
  [my-issues 1] [worklog 1] [quick-actions 1]
  [project-stats 3]
  [recent-activity 1] [due-soon 1] [team-overview 1] [sprint-progress 1]

detailed:
  [my-issues 2]  [worklog 1]
  [project-stats 3]
  [recent-activity 2] [due-soon 1]
  [team-overview 2] [sprint-progress 1]
  [quick-actions 3]

analytics:
  [project-stats 3]
  [sprint-progress 1] [my-issues 1] [worklog 1]
  [recent-activity 2] [due-soon 1]
  [team-overview 1] [quick-actions 2]
```

### Details
1. Add `PresetName = 'executive' | 'detailed' | 'analytics' | 'custom'` type
2. In `DashboardLayout`: accept `preset: PresetName` and `onPresetChange` props
3. Compute visible widget order from preset config (unless custom)
4. Apply spans from preset config
5. Save preset to localStorage on change
6. When user drags to reorder → auto-switch to 'custom'

---

## Task 2 — Settings panel

### Files
- Create: `components/dashboard/layout-settings.tsx`

### Details
1. Popover/dropdown component that shows a list of all 8 widgets with toggle switches
2. Each row: widget name + checkbox toggle
3. "Hide" = remove from grid, "Show" = add back at default position
4. "Reset to default" button → restores executive preset
5. Save hidden widgets to localStorage key `dashboard_hidden_widgets`

### Props
```typescript
interface LayoutSettingsProps {
  hiddenWidgets: string[];
  onToggleWidget: (id: string) => void;
  onReset: () => void;
}
```

---

## Task 3 — Wire presets + settings into page

### Files
- Modify: `app/(app)/dashboard/page.tsx`
- Modify: `components/dashboard/dashboard-layout.tsx`

### Details
1. Add `preset` state to page.tsx (default: 'executive')
2. Add `hiddenWidgets` state (read from localStorage on mount)
3. Filter `widgets` array based on hiddenWidgets before passing to DashboardLayout
4. Pass preset + onPresetChange to DashboardLayout
5. Pass hiddenWidgets + onToggleWidget to LayoutSettings
6. Add preset switcher button + layout settings button to toolbar

### Toolbar additions
```
[right side]
[Preset: Executive ▼] [⚙️ Layout] [🔄 Refresh]
```

---

## Quality Gates

1. **TypeScript**: `npx tsc --noEmit` — zero errors
2. **Build**: `next build` — success
3. **localStorage**: All reads/writes in `useEffect`
4. **Presets**: Switching preset changes layout immediately

## Files Summary

| Action | File |
|--------|------|
| Create | `components/dashboard/layout-settings.tsx` |
| Modify | `components/dashboard/dashboard-layout.tsx` |
| Modify | `app/(app)/dashboard/page.tsx` |
