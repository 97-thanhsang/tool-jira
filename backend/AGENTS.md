# backend/ — Express v5 API Server

> **Generated:** 2026-05-15 | Parent: `../AGENTS.md`

## OVERVIEW

Express v5 + TypeScript proxy server. Two responsibilities: (1) Jira API proxy (adds auth, streams attachments), (2) Google Gemini AI endpoints. No ORM queries in routes — DB layer is Drizzle for settings/bookmarks only.

## STRUCTURE

```
backend/
├── src/
│   ├── index.ts          # App entry: cors, body-parser, mounts routers, listen
│   ├── config.ts         # dotenv: PORT, JIRA_BASE_URL
│   ├── routes/
│   │   ├── jira.ts       # Jira proxy — all /api/jira/* traffic
│   │   └── ai.ts         # Gemini endpoints — all /api/ai/* traffic
│   └── db/               # See db/AGENTS.md
├── data/                 # SQLite file (jira-power.db) — local dev only
├── .env                  # PORT, JIRA_BASE_URL, DATABASE_URL
└── .env.example
```

## WHERE TO LOOK

| Task | Location |
|------|----------|
| Add a BE endpoint | `src/routes/jira.ts` or `src/routes/ai.ts` → register in `src/index.ts` |
| Change Jira base URL | `src/config.ts` (reads `JIRA_BASE_URL` env var) |
| Attachment streaming | `src/routes/jira.ts` — `/attachment-content/:id` route |
| AI endpoint | `src/routes/ai.ts` — reads `X-AI-Key` header per request |
| DB access | `src/db/index.ts` exports `db` and `dbReady` |

## CRITICAL: EXPRESS v5 WILDCARDS

```typescript
// CORRECT — Express v5 + path-to-regexp v8
router.all('/*path', async (req, res) => {
  const rawPath = req.params['path'];
  // rawPath can be ARRAY for nested paths — always join
  const jiraPath = Array.isArray(rawPath) ? rawPath.join('/') : (rawPath ?? '');
});

// WRONG — Express v4 syntax, breaks in v5
router.all('/*', ...)       // unnamed wildcard — forbidden
router.all('/:path*', ...)  // old repeated param — forbidden
```

## CONVENTIONS

- All routes added to `routes/jira.ts` or `routes/ai.ts` — no inline routes in `index.ts`.
- `X-Jira-Auth` header carries Basic auth token from frontend — never store it server-side.
- `X-AI-Key` header carries Gemini API key — read per-request, never cached.
- Attachment proxy uses `beforeRedirect` to re-inject `Authorization` on 3xx redirects (Jira Server behavior).
- `ts-node-dev` for dev, `tsc` → `node dist/index.js` for prod.

## ANTI-PATTERNS

- Named wildcards other than `/*path` pattern.
- Caching `X-Jira-Auth` or `X-AI-Key` between requests.
- Calling Jira API directly from frontend — must go through backend proxy.
- Adding business logic in `index.ts` — only mounting routers there.
