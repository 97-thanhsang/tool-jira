# Errors

Command failures and integration errors.

---

## [ERR-20260519-001] task/librarian

**Logged**: 2026-05-19T09:46:32.695Z
**Priority**: medium
**Status**: pending
**Area**: config

### Summary
Background librarian task failed with UnknownError during Jira worklog semantics lookup

### Error
```
While analyzing my-board worklog overwrite behavior, a background librarian task (bg_828d755e) intended to research Jira REST worklog update semantics failed with UnknownError before returning results. Better fallback is to use direct webfetch/web search for Atlassian docs instead of relying on the failed task.
```

### Suggested Fix
When librarian background lookup fails with UnknownError, retry with direct official-doc webfetch or web search and continue analysis without blocking on the failed tool.

### Metadata
- Reproducible: unknown
- Related Files:

---

## [ERR-20260519-002] task

**Logged**: 2026-05-19T10:35:14.531Z
**Priority**: medium
**Status**: pending
**Area**: config

### Summary
Background explore task failed with UnknownError despite simple read/glob/grep prompt

### Error
```
During analysis of a Railway/Railpack deployment issue, background task bg_f03582de ('Inspect deploy files') failed with UnknownError from SessionPrompt infrastructure. The failure was tool-side, not caused by repo state. Direct file reads and glob were already sufficient to continue. Future sessions should treat this as intermittent task infrastructure failure and proceed with direct tools when evidence is already available, rather than blocking.
```

### Suggested Fix
If a lightweight background exploration task fails with infrastructure UnknownError, avoid retrying immediately when equivalent direct tool evidence is already collected; continue with available evidence and optionally retry only if a material gap remains.

### Metadata
- Reproducible: unknown
- Related Files:

---
