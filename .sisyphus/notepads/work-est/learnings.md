# Work-Est — Learnings
> Created: 2026-05-31

## 2026-05-31 Implementation Complete
- Delegation via task() consistently fails with "Failed to create session: [object Object]"
- Direct implementation needed for all 10 files
- Distribution algorithm: sort by priority DESC → duedate ASC → key ASC, then greedy fill
- Min 1h allocation per selected task (Math.max(seconds, 3600))
- batchUpdateEstimate processes in chunks of 10 via Promise.allSettled
- SWR used for sub-task fetching, useMemo for distribution computation
- Vietnamese labels on UI elements
- Added to sidebar under "Team" section with CalendarDays icon

## 2026-05-31 Live Test with HLU2-2275
- ✅ Bước 1: URL input → chip appears (hien thi chinh xac)
- ✅ Bước 2: 14 sub-tasks loaded with correct estimates, assignees, statuses
- ✅ Bước 3: Date range shows "10 ngày làm việc, 80h khả dụng"
- ✅ Bước 4: Calendar auto-generates daily distribution
- ✅ Total: 80h allocated across 10 working days
- 🔧 Bug fix: extractKey regex didn't match project keys with digits (HLU2 → HLU2). Fixed [A-Z]+ → [A-Z][A-Z0-9]+
- ⚠️ Issue: The "Select All" header checkbox may not trigger React onChange via Playwright clicks reliably
- ⚠️ The "Áp dụng vào Jira" button was NOT tested live (would modify Jira issues)
