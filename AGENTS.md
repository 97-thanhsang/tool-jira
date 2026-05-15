# Tool-Jira — AI Context Entry Point

> **Generated:** 2026-05-15 | **Branch:** main | **Commit:** d2e23e3

---

## OVERVIEW

Personal Jira UI replacement connecting to `https://task.ascvn.com.vn` via proxy backend.
Stack: **Next.js 15 App Router** + **Express v5** + **Drizzle ORM** (SQLite/PG) + **@base-ui/react** + **SWR** + **Tailwind v4**.

---

## STRUCTURE

```
jira/
├── frontend/          # Next.js 15 App Router — FE port :3000
│   ├── app/           # Pages + layouts (route groups: (app), (auth))
│   ├── components/    # Domain components (board/, issues/, worklog/, team/, ui/, issue/, shared/, search/)
│   ├── hooks/         # SWR-based data hooks (11 hooks)
│   ├── lib/           # API client (axios), domain API wrappers, AI helper, utils
│   └── types/         # jira.ts — all Jira entity types
├── backend/           # Express v5 — BE port :3001
│   └── src/
│       ├── routes/    # jira.ts (proxy), ai.ts (Gemini)
│       └── db/        # Drizzle: schema.ts (SQLite), schema-pg.ts (PG)
├── docs/              # Project docs — READ before implementing
└── docker-compose.yml # Starts frontend + backend + postgres
```

---

## WHERE TO LOOK

| Task | Location |
|------|----------|
| Add/edit a page | `frontend/app/(app)/*/page.tsx` |
| Add a component | `frontend/components/{domain}/` |
| Add a data hook | `frontend/hooks/use-*.ts` |
| Add a lib utility | `frontend/lib/` |
| Add a BE route | `backend/src/routes/` + register in `backend/src/index.ts` |
| Jira types | `frontend/types/jira.ts` |
| Auth flow | `frontend/lib/api.ts` (axios interceptors) |
| AI integration | `frontend/lib/ai.ts` → `backend/src/routes/ai.ts` |
| DB schema | `backend/src/db/schema.ts` (SQLite) / `schema-pg.ts` (PG) |
| Docs index | `docs/AGENTS.md` |

---

## CRITICAL GOTCHAS

1. **Express v5 wildcard:** Routes must be `/*path` — access via `req.params['path']` (may be array — join it). NOT `/*` or `/:path*`.
2. **localStorage is client-only:** Never read in render body or SSR. Only inside `useEffect` or event handlers.
3. **@base-ui/react NOT Radix:** UI primitives come from `@base-ui/react/*`. Use `delay` not `delayDuration` on tooltips. No shadcn barrel imports.
4. **No Next API routes:** `frontend/app/api/` is empty — all server logic in Express backend. Frontend calls `NEXT_PUBLIC_API_URL/api/jira/*` and `/api/ai/*`.
5. **Auth headers:** `X-Jira-Auth` for Jira proxy, `X-AI-Key` for AI endpoints — both read from `localStorage`, injected by `lib/api.ts` (axios interceptor) and `lib/ai.ts` (fetch).
6. **Dual DB schema:** `schema.ts` = SQLite (default local), `schema-pg.ts` = PG (when `DATABASE_URL` set). `db/index.ts` picks at runtime.
7. **SWR is the state layer:** No Redux/Zustand. Server state = SWR. Local UI state = `useState`. Persistence = `localStorage`.

---

## COMMANDS

```powershell
# Backend (Terminal 1)
cd backend && npm run dev      # ts-node-dev, port 3001

# Frontend (Terminal 2)
cd frontend && npm run dev     # next dev, port 3000

# Build
cd backend && npm run build    # tsc → dist/
cd frontend && npm run build   # next build (standalone output)
```

---

## DOCS UPDATE RULES

**After every significant change:**
- New feature → `docs/roadmap.md` (mark ✅) + relevant context file
- Bug fix → `docs/known-issues.md`
- New component/hook → `docs/frontend.md`
- New BE route → `docs/backend.md`
- Auth/flow change → `docs/data-flow.md`

**See also:** `frontend/AGENTS.md` | `backend/AGENTS.md` | `docs/AGENTS.md`
