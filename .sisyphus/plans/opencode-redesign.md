# OpenCode Module — Full UI Redesign Plan

> **Date**: 2026-05-31 | **Scope**: Settings tabs + Stage nav + Pipeline hub
> **Pattern refs**: `frontend/components/` (Card, Button, Badge from ui/), `frontend/components/sidebar.tsx` (brand color)

---

## Overview

Redesign entire OpenCode UI to match the Jira Power UI design system:
- Brand color: `#0052CC` (blue, from sidebar)
- Icons: `lucide-react` (not emojis)
- Cards: `components/ui/card` (Card, CardHeader, CardContent, CardTitle)
- Colors: Tailwind shadcn-like tokens (primary, muted, foreground, destructive, etc.)

---

## TODOs

### Phase 1 — Settings Page Redesign (opencode-settings.tsx)

- [ ] P1.1 **Tab bar**: Replace emoji button tabs with icon+label segmented control using lucide-react icons (Server, MessageSquare, Bot, Zap, Puzzle, Brain, Plug, FileCode)
- [ ] P1.2 **Service section**: Redesign with status card showing port/PID/dir/Uptime in a better grid + glow effect on running dot
- [ ] P1.3 **Sessions section**: Replace list with card-based session cards showing title, date, message count; add delete with confirmation dialog
- [ ] P1.4 **Agents section**: Redesign agent cards with color dot, mode badge, model info, and hover-to-select interaction
- [ ] P1.5 **Commands section**: Card grid layout with /command badges instead of flat list
- [ ] P1.6 **Skills section**: Card grid layout with skill name badges and location info
- [ ] P1.7 **Model section**: Keep accordion providers but add cost/context info, better model selection UI
- [ ] P1.8 **MCP section**: Better status indicators, card-based server list with connect/disconnect buttons
- [ ] P1.9 **Config section**: Clean editor UI with better file path display, save/cancel in header

### Phase 2 — Stage Navigation Redesign

- [ ] P2.1 **OpenCodeStageNav**: Redesign top nav with piped progress connector and lucide icons (Search, Package, BrainCircuit, Hammer, Play)
- [ ] P2.2 **PipelineStageNav**: Better per-task stage nav with status dots, connector lines, breadcrumb styling

### Phase 3 — Pipeline Hub Redesign

- [ ] P3.1 **PipelineHub**: Replace table with card-grid layout, better empty state, legend styling
- [ ] P3.2 **PipelineProgressBar**: Improve progress bar with percentage labels, stage name tooltips

---

## Final Verification Wave

- [ ] F1: All 8 settings tabs render correctly with new design — no broken icons, correct spacing
- [ ] F2: Stage nav shows lucide icons with proper active/hover states
- [ ] F3: Pipeline hub card grid shows task keys with progress bars
- [ ] F4: Build passes: `npx next build` with zero errors
