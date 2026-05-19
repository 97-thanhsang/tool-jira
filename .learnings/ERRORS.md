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
