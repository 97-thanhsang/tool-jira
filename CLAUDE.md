# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Jira Power** — a personal Jira UI replacement connecting to `https://task.ascvn.com.vn` via a local Express proxy backend. Stack: **Next.js 16 App Router** + **Express v5** + **Drizzle ORM** (SQLite/PostgreSQL) + **@base-ui/react** + **SWR** + **Tailwind v4** + **React 19**.

## Commands

```powershell
# Backend (port 3001)
cd backend
npm install
npm run dev      # ts-node-dev hot reload
npm run build    # tsc → dist/
npm start        # node dist/index.js

# Frontend (port 3000)
cd frontend
npm install
npm run dev      # next dev
npm run build    # next build (standalone output)
npm run lint     # eslint

# Docker (full stack: postgres + backend + frontend)
docker-compose up --build
docker-compose up
```

No test suite exists yet.

## Architecture

```
jira/
├── frontend/          # Next.js 16 App Router — :3000
│   ├── app/           # Pages + layouts  (route groups: (app), (auth))
│   ├── components/    # Domain components (board/, issues/, worklog/, team/, ui/, issue/, shared/, search/)
│   ├── hooks/         # SWR-based data hooks
│   ├── lib/           # Axios instance, domain API wrappers, AI helper, utils
│   └── types/jira.ts  # All Jira entity types
├── backend/           # Express v5 — :3001
│   └── src/
│       ├── routes/    # jira.ts (proxy to Jira), ai.ts (Gemini endpoints)
│       └── db/        # Drizzle: schema.ts (SQLite), schema-pg.ts (PG)
├── docs/              # Project docs — read before implementing features
└── docker-compose.yml
```

**Data flow:** Frontend → `NEXT_PUBLIC_API_URL/api/jira/*` → Express proxy → `https://task.ascvn.com.vn` Jira REST API v2.

**Auth:** User enters credentials → encoded as base64 → stored in `localStorage['jira_auth']` → sent as `X-Jira-Auth` header → backend forwards as `Authorization: Basic ...` to Jira. Any 401 triggers auto-logout.

**State management:** SWR for server state, `useState` for local UI state, `localStorage` for persistence. No Redux/Zustand.

**Database:** SQLite by default (local dev, auto-migrating). PostgreSQL when `DATABASE_URL` env var is set. Runtime detection in `backend/src/db/index.ts`.

**AI features:** `frontend/lib/ai.ts` → `backend/src/routes/ai.ts` → Google Gemini 2.5 Flash. AI API key stored only in browser localStorage, sent as `X-AI-Key` header.

## Where to Look

| Task | Location |
|------|----------|
| Add/edit a page | `frontend/app/(app)/*/page.tsx` |
| Add a component | `frontend/components/{domain}/` |
| Add a data hook | `frontend/hooks/use-*.ts` |
| Add a backend route | `backend/src/routes/` + register in `backend/src/index.ts` |
| Jira entity types | `frontend/types/jira.ts` |
| Auth/API interceptors | `frontend/lib/api.ts` |
| AI integration | `frontend/lib/ai.ts` → `backend/src/routes/ai.ts` |
| DB schema | `backend/src/db/schema.ts` (SQLite) / `schema-pg.ts` (PG) |

## Critical Gotchas

1. **Express v5 wildcard syntax:** Routes must be `/*path` (not `/*`). Access via `req.params['path']` — may be an array, so join it: `[req.params['path']].flat().join('/')`.

2. **`localStorage` is client-only:** Never read in a component's render body or any SSR context. Always access inside `useEffect` or event handlers, or use `isAuthenticated()` from `lib/api.ts`.

3. **`@base-ui/react` is not Radix UI:** UI primitives come from `@base-ui/react/*` — no `asChild` prop, use `delay` (not `delayDuration`) on Tooltips, no shadcn barrel imports. Import via `@/components/ui/*` wrappers, never directly from `@base-ui/react` in feature components.

4. **No Next.js API routes:** `frontend/app/api/` is intentionally empty. All server logic lives in the Express backend.

5. **All pages are `'use client'`:** No server components with data fetching. The App Router is used for routing only.

6. **Dual DB schema:** Any schema change must be made in both `schema.ts` (SQLite) and `schema-pg.ts` (PostgreSQL).

## After Significant Changes

Per project convention, update the relevant file in `docs/`:
- New feature → `docs/roadmap.md` (mark ✅) + relevant context file
- Bug fix → `docs/known-issues.md`
- New component/hook → `docs/frontend.md`
- New backend route → `docs/backend.md`
- Auth/flow change → `docs/data-flow.md`
