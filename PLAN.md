# Jira Power UI — Implementation Plan (MVP Phase 1)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local-first Jira alternative UI with Login, My Board (Kanban), and Issue Detail pages — connecting to `https://task.ascvn.com.vn` via a Node.js proxy backend.

**Architecture:** Two separate folders: `frontend/` (Next.js 14 App Router + TypeScript + Tailwind + shadcn/ui) and `backend/` (Express + TypeScript + SQLite via Drizzle ORM). Backend acts as CORS proxy to Jira REST API v2 and will host AI endpoints later. Frontend communicates only with localhost backend, never directly with Jira.

**Tech Stack:** Next.js 14, TypeScript, Tailwind CSS, shadcn/ui, Express.js, Drizzle ORM, SQLite (better-sqlite3), Jira REST API v2

---

## File Map

### Backend (`E:\SOURCE\jira\backend\`)
```
backend/
├── src/
│   ├── index.ts                  # Express app entry, middleware setup
│   ├── config.ts                 # Env vars, Jira base URL
│   ├── db/
│   │   ├── schema.ts             # Drizzle schema (users_settings, bookmarks)
│   │   └── index.ts              # DB connection
│   ├── middleware/
│   │   └── auth.ts               # Validate Jira credentials from request headers
│   ├── routes/
│   │   ├── jira.ts               # Proxy all /api/jira/* → Jira REST API
│   │   └── settings.ts           # CRUD user settings in SQLite
│   └── types/
│       └── jira.ts               # TypeScript types for Jira API responses
├── package.json
├── tsconfig.json
└── .env
```

### Frontend (`E:\SOURCE\jira\frontend\`)
```
frontend/
├── app/
│   ├── layout.tsx                # Root layout, providers
│   ├── page.tsx                  # Redirect → /board or /login
│   ├── (auth)/
│   │   └── login/
│   │       └── page.tsx          # Login page
│   └── (app)/
│       ├── layout.tsx            # App shell: sidebar + content area
│       ├── board/
│       │   └── page.tsx          # My Board kanban page
│       └── issues/
│           └── [key]/
│               └── page.tsx      # Issue detail page
├── components/
│   ├── ui/                       # shadcn/ui generated components
│   ├── sidebar.tsx               # Left navigation sidebar
│   ├── board/
│   │   ├── kanban-board.tsx      # 3-column kanban container
│   │   └── issue-card.tsx        # Card per issue
│   ├── issue/
│   │   ├── issue-detail.tsx      # Main detail layout
│   │   ├── wiki-renderer.tsx     # Jira wiki markup → React
│   │   ├── transition-button.tsx # Status change dropdown
│   │   └── issue-sidebar.tsx     # Right metadata sidebar
│   └── shared/
│       ├── priority-icon.tsx     # Priority colored icon
│       ├── status-badge.tsx      # Status chip
│       └── issue-type-icon.tsx   # Story/Sub-task/Bug icon
├── lib/
│   ├── api.ts                    # Axios instance pointing to backend
│   ├── auth.ts                   # Auth context + localStorage helpers
│   └── jira-wiki.ts              # Wiki markup parser/renderer logic
├── hooks/
│   ├── use-my-issues.ts          # useSWR hook for assigned issues
│   └── use-issue.ts              # useSWR hook for single issue
├── types/
│   └── jira.ts                   # Shared Jira types (mirrored from backend)
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── .env.local
```

---

## Task 1: Backend — Project Setup + Jira Proxy

**Files:**
- Create: `backend/package.json`
- Create: `backend/tsconfig.json`
- Create: `backend/.env`
- Create: `backend/src/index.ts`
- Create: `backend/src/config.ts`
- Create: `backend/src/routes/jira.ts`

- [ ] **Step 1: Init backend project**

```bash
cd E:\SOURCE\jira
mkdir backend
cd backend
npm init -y
npm install express cors axios dotenv
npm install -D typescript @types/node @types/express @types/cors ts-node-dev
```

- [ ] **Step 2: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 3: Create `backend/.env`**

```env
PORT=3001
JIRA_BASE_URL=https://task.ascvn.com.vn
```

- [ ] **Step 4: Create `backend/src/config.ts`**

```typescript
import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: process.env.PORT || 3001,
  jiraBaseUrl: process.env.JIRA_BASE_URL || 'https://task.ascvn.com.vn',
};
```

- [ ] **Step 5: Create `backend/src/routes/jira.ts`** — proxy tất cả requests đến Jira

```typescript
import { Router, Request, Response } from 'express';
import axios, { AxiosError } from 'axios';
import { config } from '../config';

const router = Router();

// Proxy all requests: GET/POST /api/jira/* → Jira REST API v2
router.all('/*', async (req: Request, res: Response) => {
  const authHeader = req.headers['x-jira-auth'];
  if (!authHeader) {
    return res.status(401).json({ error: 'Missing X-Jira-Auth header' });
  }

  const jiraPath = req.params[0]; // everything after /api/jira/
  const jiraUrl = `${config.jiraBaseUrl}/rest/api/2/${jiraPath}`;

  try {
    const response = await axios({
      method: req.method as any,
      url: jiraUrl,
      headers: {
        Authorization: `Basic ${authHeader}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      params: req.query,
      data: req.method !== 'GET' ? req.body : undefined,
    });

    return res.status(response.status).json(response.data);
  } catch (err) {
    const error = err as AxiosError;
    const status = error.response?.status || 500;
    const data = error.response?.data || { error: 'Jira API error' };
    return res.status(status).json(data);
  }
});

export default router;
```

- [ ] **Step 6: Create `backend/src/index.ts`**

```typescript
import express from 'express';
import cors from 'cors';
import { config } from './config';
import jiraRouter from './routes/jira';

const app = express();

app.use(cors({ origin: 'http://localhost:3000' }));
app.use(express.json());

// Health check
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// Jira proxy: /api/jira/* → Jira REST API
app.use('/api/jira', jiraRouter);

app.listen(config.port, () => {
  console.log(`Backend running at http://localhost:${config.port}`);
});
```

- [ ] **Step 7: Add scripts to `backend/package.json`**

```json
{
  "scripts": {
    "dev": "ts-node-dev --respawn --transpile-only src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  }
}
```

- [ ] **Step 8: Test backend chạy được**

```bash
cd E:\SOURCE\jira\backend
npm run dev
```

Expected: `Backend running at http://localhost:3001`

- [ ] **Step 9: Test proxy hoạt động**

Mở browser hoặc curl:
```bash
curl -H "X-Jira-Auth: <base64(SangNT:Asc_SangNT2023)>" http://localhost:3001/api/jira/myself
```

Expected: JSON với `{"displayName":"Sang Nguyen Thanh",...}`

---

## Task 2: Backend — SQLite Database Setup

**Files:**
- Create: `backend/src/db/schema.ts`
- Create: `backend/src/db/index.ts`
- Modify: `backend/package.json` (add drizzle deps)

- [ ] **Step 1: Install Drizzle + SQLite**

```bash
cd E:\SOURCE\jira\backend
npm install drizzle-orm better-sqlite3
npm install -D @types/better-sqlite3 drizzle-kit
```

- [ ] **Step 2: Create `backend/src/db/schema.ts`**

```typescript
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const userSettings = sqliteTable('user_settings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  key: text('key').notNull().unique(),      // e.g. "theme", "defaultProject"
  value: text('value').notNull(),            // JSON string
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const bookmarks = sqliteTable('bookmarks', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  issueKey: text('issue_key').notNull().unique(),  // e.g. "HLU2-2585"
  summary: text('summary').notNull(),
  projectKey: text('project_key').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});
```

- [ ] **Step 3: Create `backend/src/db/index.ts`**

```typescript
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';
import path from 'path';

const DB_PATH = path.join(__dirname, '../../data/jira-power.db');

// Ensure data dir exists
import fs from 'fs';
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const sqlite = new Database(DB_PATH);
export const db = drizzle(sqlite, { schema });

// Create tables if not exist (simple migration for now)
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS user_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT NOT NULL UNIQUE,
    value TEXT NOT NULL,
    updated_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS bookmarks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    issue_key TEXT NOT NULL UNIQUE,
    summary TEXT NOT NULL,
    project_key TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );
`);
```

- [ ] **Step 4: Verify DB file được tạo khi start backend**

```bash
cd E:\SOURCE\jira\backend
npm run dev
```

Expected: File `backend/data/jira-power.db` được tạo tự động.

---

## Task 3: Frontend — Project Setup

**Files:**
- Create: `frontend/` (Next.js project)
- Create: `frontend/.env.local`
- Create: `frontend/lib/api.ts`
- Create: `frontend/types/jira.ts`

- [ ] **Step 1: Create Next.js project**

```bash
cd E:\SOURCE\jira
npx create-next-app@latest frontend --typescript --tailwind --eslint --app --src-dir no --import-alias "@/*"
```

Chọn: Yes App Router, No Turbopack (stable), `@/*` alias.

- [ ] **Step 2: Install dependencies**

```bash
cd E:\SOURCE\jira\frontend
npm install axios swr
npx shadcn@latest init
```

shadcn init options: Default style, Slate base color, yes CSS variables.

- [ ] **Step 3: Install shadcn components cần dùng**

```bash
npx shadcn@latest add button input label card badge avatar separator dropdown-menu tooltip skeleton
```

- [ ] **Step 4: Create `frontend/.env.local`**

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

- [ ] **Step 5: Create `frontend/types/jira.ts`**

```typescript
export interface JiraUser {
  name: string;
  displayName: string;
  emailAddress: string;
  avatarUrls: { '48x48': string; '24x24': string };
}

export interface JiraStatus {
  name: string;
  statusCategory: {
    key: 'new' | 'indeterminate' | 'done';
    colorName: string;
  };
}

export interface JiraPriority {
  name: 'Highest' | 'High' | 'Medium' | 'Low' | 'Lowest' | 'Blocker' | 'Minor';
  iconUrl: string;
}

export interface JiraIssueType {
  name: string;
  subtask: boolean;
  iconUrl: string;
}

export interface JiraIssue {
  id: string;
  key: string;
  fields: {
    summary: string;
    description: string | null;
    status: JiraStatus;
    priority: JiraPriority;
    issuetype: JiraIssueType;
    assignee: JiraUser | null;
    reporter: JiraUser;
    project: { key: string; name: string };
    created: string;
    updated: string;
    subtasks?: JiraIssue[];
    parent?: { key: string; fields: { summary: string } };
    labels: string[];
    comment?: { comments: JiraComment[] };
  };
}

export interface JiraComment {
  id: string;
  author: JiraUser;
  body: string;
  created: string;
}

export interface JiraTransition {
  id: string;
  name: string;
  to: JiraStatus;
}

export interface JiraSearchResult {
  total: number;
  issues: JiraIssue[];
}
```

- [ ] **Step 6: Create `frontend/lib/api.ts`** — Axios instance

```typescript
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export function getAuthHeader(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('jira_auth') || '';
}

export const api = axios.create({
  baseURL: `${API_URL}/api/jira`,
});

api.interceptors.request.use((config) => {
  const auth = getAuthHeader();
  if (auth) {
    config.headers['X-Jira-Auth'] = auth;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('jira_auth');
      localStorage.removeItem('jira_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth helpers
export function saveAuth(username: string, password: string, user: object) {
  const encoded = btoa(`${username}:${password}`);
  localStorage.setItem('jira_auth', encoded);
  localStorage.setItem('jira_user', JSON.stringify(user));
}

export function clearAuth() {
  localStorage.removeItem('jira_auth');
  localStorage.removeItem('jira_user');
}

export function getStoredUser() {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('jira_user');
  return raw ? JSON.parse(raw) : null;
}

export function isAuthenticated(): boolean {
  return !!getAuthHeader();
}
```

---

## Task 4: Frontend — Login Page

**Files:**
- Create: `frontend/app/(auth)/login/page.tsx`
- Create: `frontend/app/page.tsx` (redirect logic)
- Create: `frontend/app/layout.tsx` (root layout)

- [ ] **Step 1: Create root `frontend/app/layout.tsx`**

```tsx
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Jira Power UI',
  description: 'Faster Jira interface for developers',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
```

- [ ] **Step 2: Create `frontend/app/page.tsx`** — redirect to board or login

```tsx
'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/api';

export default function Home() {
  const router = useRouter();
  useEffect(() => {
    if (isAuthenticated()) {
      router.replace('/board');
    } else {
      router.replace('/login');
    }
  }, [router]);
  return null;
}
```

- [ ] **Step 3: Create `frontend/app/(auth)/login/page.tsx`**

```tsx
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, saveAuth } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Temporarily set auth header for this request
      const encoded = btoa(`${username}:${password}`);
      const response = await api.get('/myself', {
        headers: { 'X-Jira-Auth': encoded },
      });
      saveAuth(username, password, response.data);
      router.replace('/board');
    } catch (err: any) {
      if (err.response?.status === 401) {
        setError('Invalid username or password. Please try again.');
      } else {
        setError('Cannot connect to Jira server. Check your network.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F4F5F7]">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#0052CC] mb-3">
            <span className="text-white font-bold text-xl">J</span>
          </div>
          <h1 className="text-2xl font-semibold text-[#172B4D]">Jira Power UI</h1>
          <p className="text-sm text-[#5E6C84] mt-1">Log in with your Jira account</p>
        </div>

        <Card className="border-0 shadow-md">
          <CardContent className="pt-6">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="username" className="text-[#172B4D] text-sm font-medium">
                  Username
                </Label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. SangNT"
                  required
                  className="border-[#DFE1E6] focus:border-[#0052CC] focus:ring-[#0052CC]"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-[#172B4D] text-sm font-medium">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Your Jira password"
                  required
                  className="border-[#DFE1E6] focus:border-[#0052CC] focus:ring-[#0052CC]"
                />
              </div>

              {error && (
                <div className="rounded-sm bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-[#0052CC] hover:bg-[#0065FF] text-white font-medium h-9 rounded-sm"
              >
                {loading ? 'Logging in...' : 'Log in'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-[#5E6C84] mt-4">
          Connecting to{' '}
          <span className="font-medium">task.ascvn.com.vn</span>
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Test login page hiển thị**

```bash
cd E:\SOURCE\jira\frontend
npm run dev
```

Mở `http://localhost:3000` → phải redirect sang `/login` → thấy form login.

- [ ] **Step 5: Test login thực tế**

Nhập `SangNT` / `Asc_SangNT2023` → phải redirect sang `/board` (sẽ là blank page, OK).

---

## Task 5: Frontend — App Shell (Sidebar + Layout)

**Files:**
- Create: `frontend/app/(app)/layout.tsx`
- Create: `frontend/components/sidebar.tsx`
- Create: `frontend/components/shared/status-badge.tsx`
- Create: `frontend/components/shared/priority-icon.tsx`

- [ ] **Step 1: Create `frontend/components/shared/status-badge.tsx`**

```tsx
import { Badge } from '@/components/ui/badge';
import { JiraStatus } from '@/types/jira';
import { cn } from '@/lib/utils';

const categoryColors: Record<string, string> = {
  new: 'bg-[#DFE1E6] text-[#42526E]',
  indeterminate: 'bg-[#DEEBFF] text-[#0052CC]',
  done: 'bg-[#E3FCEF] text-[#006644]',
};

export function StatusBadge({ status }: { status: JiraStatus }) {
  const colorClass = categoryColors[status.statusCategory.key] || categoryColors.new;
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-medium uppercase tracking-wide', colorClass)}>
      {status.name}
    </span>
  );
}
```

- [ ] **Step 2: Create `frontend/components/shared/priority-icon.tsx`**

```tsx
import { JiraPriority } from '@/types/jira';

const priorityColors: Record<string, string> = {
  Highest: '#DE350B',
  High: '#FF5630',
  Medium: '#FFAB00',
  Low: '#2684FF',
  Lowest: '#2684FF',
  Blocker: '#DE350B',
  Minor: '#6B778C',
};

export function PriorityIcon({ priority }: { priority: JiraPriority }) {
  const color = priorityColors[priority.name] || '#6B778C';
  return (
    <div
      className="w-3 h-3 rounded-full flex-shrink-0"
      style={{ backgroundColor: color }}
      title={priority.name}
    />
  );
}
```

- [ ] **Step 3: Create `frontend/components/sidebar.tsx`**

```tsx
'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, ListTodo, FolderOpen, Settings, ExternalLink, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { clearAuth, getStoredUser } from '@/lib/api';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const navItems = [
  { href: '/board', label: 'My Board', icon: LayoutDashboard },
  { href: '/issues', label: 'My Issues', icon: ListTodo },
  { href: '/projects', label: 'Projects', icon: FolderOpen },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const user = getStoredUser();
  const initials = user?.displayName
    ? user.displayName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'U';

  function handleLogout() {
    clearAuth();
    router.replace('/login');
  }

  return (
    <TooltipProvider delayDuration={300}>
      <aside className="w-[240px] min-h-screen bg-[#0052CC] flex flex-col text-white">
        {/* Logo */}
        <div className="px-4 py-4 border-b border-blue-700">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-white rounded flex items-center justify-center">
              <span className="text-[#0052CC] font-bold text-sm">J</span>
            </div>
            <span className="font-semibold text-sm">Jira Power UI</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3">
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-white/20 text-white'
                    : 'text-blue-100 hover:bg-white/10 hover:text-white'
                )}
              >
                <Icon size={16} />
                {label}
              </Link>
            );
          })}

          <a
            href="https://task.ascvn.com.vn"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-blue-100 hover:bg-white/10 hover:text-white transition-colors mt-1"
          >
            <ExternalLink size={16} />
            Open Jira
          </a>
        </nav>

        {/* User */}
        <div className="px-4 py-3 border-t border-blue-700">
          <div className="flex items-center gap-2 mb-2">
            <Avatar className="w-7 h-7">
              <AvatarFallback className="bg-white/20 text-white text-xs">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{user?.displayName || 'User'}</p>
              <p className="text-xs text-blue-200 truncate">{user?.emailAddress || ''}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-xs text-blue-200 hover:text-white transition-colors"
          >
            <LogOut size={12} />
            Log out
          </button>
        </div>
      </aside>
    </TooltipProvider>
  );
}
```

- [ ] **Step 4: Create `frontend/app/(app)/layout.tsx`**

```tsx
'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/api';
import { Sidebar } from '@/components/sidebar';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace('/login');
    }
  }, [router]);

  return (
    <div className="flex min-h-screen bg-[#F4F5F7]">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
```

- [ ] **Step 5: Test sidebar hiển thị sau login**

Navigate đến `http://localhost:3000/board` sau khi đã login → thấy sidebar xanh bên trái.

---

## Task 6: Frontend — My Board Page

**Files:**
- Create: `frontend/hooks/use-my-issues.ts`
- Create: `frontend/components/board/kanban-board.tsx`
- Create: `frontend/components/board/issue-card.tsx`
- Create: `frontend/app/(app)/board/page.tsx`

- [ ] **Step 1: Create `frontend/hooks/use-my-issues.ts`**

```typescript
import useSWR from 'swr';
import { api } from '@/lib/api';
import { JiraIssue, JiraSearchResult } from '@/types/jira';

const fetcher = (url: string) =>
  api.get<JiraSearchResult>(url, {
    params: {
      jql: 'assignee = currentUser() AND resolution = Unresolved ORDER BY updated DESC',
      maxResults: 100,
      fields: 'summary,status,priority,issuetype,project,updated,assignee',
    },
  }).then((r) => r.data);

export function useMyIssues() {
  const { data, error, isLoading, mutate } = useSWR('/search', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 30000,
  });

  const grouped = {
    todo: [] as JiraIssue[],
    inProgress: [] as JiraIssue[],
    done: [] as JiraIssue[],
  };

  data?.issues.forEach((issue) => {
    const cat = issue.fields.status.statusCategory.key;
    if (cat === 'new') grouped.todo.push(issue);
    else if (cat === 'indeterminate') grouped.inProgress.push(issue);
    else if (cat === 'done') grouped.done.push(issue);
  });

  return { grouped, total: data?.total || 0, isLoading, error, mutate };
}
```

- [ ] **Step 2: Create `frontend/components/board/issue-card.tsx`**

```tsx
import Link from 'next/link';
import { JiraIssue } from '@/types/jira';
import { StatusBadge } from '@/components/shared/status-badge';
import { PriorityIcon } from '@/components/shared/priority-icon';
import { ExternalLink } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface IssueCardProps {
  issue: JiraIssue;
}

const issueTypeColors: Record<string, string> = {
  Story: 'bg-[#36B37E] text-white',
  'Sub-task': 'bg-[#0052CC] text-white',
  Bug: 'bg-[#DE350B] text-white',
  Task: 'bg-[#4BADE8] text-white',
};

export function IssueCard({ issue }: IssueCardProps) {
  const typeColor = issueTypeColors[issue.fields.issuetype.name] || 'bg-gray-400 text-white';

  return (
    <Card className="group relative p-3 bg-white border border-[#DFE1E6] rounded-sm hover:shadow-md transition-shadow cursor-pointer">
      {/* Type + Key */}
      <div className="flex items-center gap-1.5 mb-2">
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-sm ${typeColor}`}>
          {issue.fields.issuetype.name === 'Sub-task' ? 'SUB' : issue.fields.issuetype.name.slice(0, 3).toUpperCase()}
        </span>
        <Link
          href={`/issues/${issue.key}`}
          className="text-xs text-[#0052CC] font-medium hover:underline"
        >
          {issue.key}
        </Link>
        <a
          href={`https://task.ascvn.com.vn/browse/${issue.key}`}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto opacity-0 group-hover:opacity-100 text-[#5E6C84] hover:text-[#0052CC] transition-opacity"
        >
          <ExternalLink size={12} />
        </a>
      </div>

      {/* Summary */}
      <Link href={`/issues/${issue.key}`}>
        <p className="text-sm text-[#172B4D] leading-snug line-clamp-2 mb-2 hover:text-[#0052CC]">
          {issue.fields.summary}
        </p>
      </Link>

      {/* Footer */}
      <div className="flex items-center gap-2">
        <PriorityIcon priority={issue.fields.priority} />
        <span className="text-[10px] text-[#5E6C84] truncate flex-1">
          {issue.fields.project.name}
        </span>
      </div>
    </Card>
  );
}
```

- [ ] **Step 3: Create `frontend/components/board/kanban-board.tsx`**

```tsx
import { JiraIssue } from '@/types/jira';
import { IssueCard } from './issue-card';
import { Skeleton } from '@/components/ui/skeleton';

interface Column {
  id: string;
  label: string;
  issues: JiraIssue[];
  color: string;
}

interface KanbanBoardProps {
  columns: Column[];
  isLoading: boolean;
}

function ColumnSkeleton() {
  return (
    <div className="space-y-2">
      {[1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-24 w-full rounded-sm" />
      ))}
    </div>
  );
}

export function KanbanBoard({ columns, isLoading }: KanbanBoardProps) {
  return (
    <div className="grid grid-cols-3 gap-4 h-full">
      {columns.map((col) => (
        <div key={col.id} className="flex flex-col">
          {/* Column header */}
          <div className="flex items-center gap-2 mb-3 px-1">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: col.color }} />
            <h3 className="text-xs font-semibold text-[#5E6C84] uppercase tracking-wider">
              {col.label}
            </h3>
            <span className="ml-auto text-xs text-[#5E6C84] bg-[#DFE1E6] px-1.5 py-0.5 rounded-full">
              {col.issues.length}
            </span>
          </div>

          {/* Cards */}
          <div className="flex-1 space-y-2 overflow-y-auto pr-1">
            {isLoading ? (
              <ColumnSkeleton />
            ) : col.issues.length === 0 ? (
              <div className="text-center py-8 text-xs text-[#5E6C84]">No issues</div>
            ) : (
              col.issues.map((issue) => (
                <IssueCard key={issue.id} issue={issue} />
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Create `frontend/app/(app)/board/page.tsx`**

```tsx
'use client';
import { useMyIssues } from '@/hooks/use-my-issues';
import { KanbanBoard } from '@/components/board/kanban-board';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

export default function BoardPage() {
  const { grouped, total, isLoading, error, mutate } = useMyIssues();

  const columns = [
    { id: 'todo', label: 'To Do', issues: grouped.todo, color: '#5E6C84' },
    { id: 'inProgress', label: 'In Progress', issues: grouped.inProgress, color: '#0052CC' },
    { id: 'done', label: 'Done', issues: grouped.done, color: '#36B37E' },
  ];

  if (error) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-600 mb-2">Failed to load issues</p>
        <Button variant="outline" size="sm" onClick={() => mutate()}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-[#172B4D]">My Board</h1>
          {!isLoading && (
            <p className="text-sm text-[#5E6C84] mt-0.5">{total} issues assigned to you</p>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => mutate()}
          disabled={isLoading}
          className="border-[#DFE1E6] text-[#5E6C84] hover:bg-[#F4F5F7]"
        >
          <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          <span className="ml-1.5">Refresh</span>
        </Button>
      </div>

      {/* Board */}
      <div className="flex-1 overflow-hidden">
        <KanbanBoard columns={columns} isLoading={isLoading} />
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Test board hiển thị data thực**

Sau khi login, navigate `/board` → thấy 3 cột với issues thực từ Jira (expected: ~15 issues của SangNT).

---

## Task 7: Frontend — Issue Detail Page

**Files:**
- Create: `frontend/hooks/use-issue.ts`
- Create: `frontend/lib/jira-wiki.ts`
- Create: `frontend/components/issue/wiki-renderer.tsx`
- Create: `frontend/components/issue/transition-button.tsx`
- Create: `frontend/components/issue/issue-sidebar.tsx`
- Create: `frontend/app/(app)/issues/[key]/page.tsx`

- [ ] **Step 1: Create `frontend/lib/jira-wiki.ts`** — Jira wiki markup parser

```typescript
/**
 * Convert Jira wiki markup to HTML string.
 * Handles the common patterns seen in ASC Jira descriptions.
 */
export function jiraWikiToHtml(text: string): string {
  if (!text) return '';

  let html = text
    // Escape HTML first
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

    // Headings: h1. h2. h3.
    .replace(/^h1\.\s+(.+)$/gm, '<h1 class="text-xl font-bold text-[#172B4D] mt-4 mb-2">$1</h1>')
    .replace(/^h2\.\s+(.+)$/gm, '<h2 class="text-lg font-semibold text-[#172B4D] mt-3 mb-2">$1</h2>')
    .replace(/^h3\.\s+(.+)$/gm, '<h3 class="text-base font-semibold text-[#172B4D] mt-2 mb-1">$1</h3>')

    // Bold: {*}text{*} and *text*
    .replace(/\{\*\}(.*?)\{\*\}/g, '<strong>$1</strong>')
    .replace(/\*([^*\n]+)\*/g, '<strong>$1</strong>')

    // Italic: _text_
    .replace(/_((?!_)[^_\n]+)_/g, '<em>$1</em>')

    // Code blocks: {code:lang}...{code} or {code}...{code}
    .replace(
      /\{code(?::[^}]*)?\}([\s\S]*?)\{code\}/g,
      '<pre class="bg-[#F4F5F7] border border-[#DFE1E6] rounded p-3 my-2 overflow-x-auto text-sm font-mono">$1</pre>'
    )

    // Inline code: {{text}}
    .replace(/\{\{([^}]+)\}\}/g, '<code class="bg-[#F4F5F7] px-1 py-0.5 rounded text-sm font-mono text-[#DE350B]">$1</code>')

    // Images: !filename.png! or !filename.png|width=500!
    .replace(/!([^|!\n]+?)(?:\|[^!]*)?\!/g, '<span class="inline-block bg-[#DFE1E6] text-[#5E6C84] text-xs px-2 py-1 rounded my-1">[Image: $1]</span>')

    // Links: [text|url]
    .replace(/\[([^\]|]+)\|([^\]]+)\]/g, '<a href="$2" class="text-[#0052CC] hover:underline" target="_blank" rel="noopener">$1</a>')

    // Numbered lists: lines starting with # 
    .replace(/^(#+ .+(\n#.+)*)/gm, (match) => {
      const items = match.split('\n').filter(Boolean).map(line =>
        `<li class="ml-4 list-decimal">${line.replace(/^#+ /, '')}</li>`
      ).join('');
      return `<ol class="my-2 space-y-1">${items}</ol>`;
    })

    // Bullet lists: lines starting with *
    .replace(/^(\* .+(\n\*.+)*)/gm, (match) => {
      const items = match.split('\n').filter(Boolean).map(line =>
        `<li class="ml-4 list-disc">${line.replace(/^\* /, '')}</li>`
      ).join('');
      return `<ul class="my-2 space-y-1">${items}</ul>`;
    })

    // Line breaks
    .replace(/\r\n/g, '\n')
    .replace(/\n\n+/g, '</p><p class="my-2">')
    .replace(/\n/g, '<br />');

  return `<p class="my-2">${html}</p>`;
}
```

- [ ] **Step 2: Create `frontend/components/issue/wiki-renderer.tsx`**

```tsx
import { jiraWikiToHtml } from '@/lib/jira-wiki';

interface WikiRendererProps {
  content: string | null;
}

export function WikiRenderer({ content }: WikiRendererProps) {
  if (!content) {
    return <p className="text-[#5E6C84] text-sm italic">No description provided.</p>;
  }

  return (
    <div
      className="text-sm text-[#172B4D] leading-relaxed"
      dangerouslySetInnerHTML={{ __html: jiraWikiToHtml(content) }}
    />
  );
}
```

- [ ] **Step 3: Create `frontend/components/issue/transition-button.tsx`**

```tsx
'use client';
import { useState } from 'react';
import { api } from '@/lib/api';
import { JiraTransition } from '@/types/jira';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ChevronDown, Loader2 } from 'lucide-react';

interface TransitionButtonProps {
  issueKey: string;
  currentStatus: string;
  onTransitioned: () => void;
}

export function TransitionButton({ issueKey, currentStatus, onTransitioned }: TransitionButtonProps) {
  const [transitions, setTransitions] = useState<JiraTransition[]>([]);
  const [loading, setLoading] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [open, setOpen] = useState(false);

  async function loadTransitions() {
    if (transitions.length > 0) return;
    setLoading(true);
    try {
      const res = await api.get<{ transitions: JiraTransition[] }>(`/issue/${issueKey}/transitions`);
      setTransitions(res.data.transitions);
    } finally {
      setLoading(false);
    }
  }

  async function doTransition(transition: JiraTransition) {
    setTransitioning(true);
    setOpen(false);
    try {
      await api.post(`/issue/${issueKey}/transitions`, {
        transition: { id: transition.id },
      });
      onTransitioned();
    } finally {
      setTransitioning(false);
    }
  }

  return (
    <DropdownMenu open={open} onOpenChange={(v) => { setOpen(v); if (v) loadTransitions(); }}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={transitioning}
          className="w-full justify-between border-[#DFE1E6] text-[#172B4D] text-xs h-8"
        >
          {transitioning ? <Loader2 size={12} className="animate-spin" /> : <span className="truncate">{currentStatus}</span>}
          <ChevronDown size={12} className="ml-1 flex-shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        {loading ? (
          <DropdownMenuItem disabled>Loading...</DropdownMenuItem>
        ) : transitions.length === 0 ? (
          <DropdownMenuItem disabled>No transitions available</DropdownMenuItem>
        ) : (
          transitions.map((t) => (
            <DropdownMenuItem key={t.id} onClick={() => doTransition(t)} className="text-sm">
              → {t.name}
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

- [ ] **Step 4: Create `frontend/hooks/use-issue.ts`**

```typescript
import useSWR from 'swr';
import { api } from '@/lib/api';
import { JiraIssue } from '@/types/jira';

export function useIssue(key: string) {
  const { data, error, isLoading, mutate } = useSWR(
    key ? `/issue/${key}` : null,
    (url: string) =>
      api.get<JiraIssue>(url, {
        params: {
          expand: 'renderedFields',
          fields: 'summary,description,status,priority,issuetype,project,assignee,reporter,created,updated,subtasks,parent,labels,comment',
        },
      }).then((r) => r.data),
    { revalidateOnFocus: false }
  );

  return { issue: data, isLoading, error, mutate };
}
```

- [ ] **Step 5: Create `frontend/app/(app)/issues/[key]/page.tsx`**

```tsx
'use client';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useIssue } from '@/hooks/use-issue';
import { WikiRenderer } from '@/components/issue/wiki-renderer';
import { TransitionButton } from '@/components/issue/transition-button';
import { StatusBadge } from '@/components/shared/status-badge';
import { PriorityIcon } from '@/components/shared/priority-icon';
import { Skeleton } from '@/components/ui/skeleton';
import { ExternalLink, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function IssueDetailPage() {
  const params = useParams();
  const issueKey = params.key as string;
  const { issue, isLoading, error, mutate } = useIssue(issueKey);

  if (isLoading) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <Skeleton className="h-8 w-48 mb-4" />
        <Skeleton className="h-6 w-3/4 mb-6" />
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/6" />
          </div>
          <div className="space-y-3">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !issue) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-600 mb-3">Issue not found or failed to load</p>
        <Link href="/board"><Button variant="outline" size="sm">← Back to Board</Button></Link>
      </div>
    );
  }

  const f = issue.fields;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-4 text-sm text-[#5E6C84]">
        <Link href="/board" className="hover:text-[#0052CC] flex items-center gap-1">
          <ArrowLeft size={14} /> Board
        </Link>
        <span>/</span>
        <span className="text-[#172B4D] font-medium">{issueKey}</span>
      </div>

      {/* Title */}
      <div className="flex items-start gap-3 mb-6">
        <h1 className="text-xl font-semibold text-[#172B4D] flex-1 leading-snug">
          {f.summary}
        </h1>
        <a
          href={`https://task.ascvn.com.vn/browse/${issueKey}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-shrink-0 text-[#5E6C84] hover:text-[#0052CC] mt-1"
          title="Open in Jira"
        >
          <ExternalLink size={16} />
        </a>
      </div>

      {/* Body */}
      <div className="grid grid-cols-3 gap-6">
        {/* Left: Description + Subtasks */}
        <div className="col-span-2 space-y-6">
          {/* Description */}
          <section>
            <h2 className="text-xs font-semibold text-[#5E6C84] uppercase tracking-wider mb-3">Description</h2>
            <div className="bg-white rounded-sm border border-[#DFE1E6] p-4">
              <WikiRenderer content={f.description} />
            </div>
          </section>

          {/* Sub-tasks */}
          {f.subtasks && f.subtasks.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold text-[#5E6C84] uppercase tracking-wider mb-3">
                Sub-tasks ({f.subtasks.length})
              </h2>
              <div className="bg-white rounded-sm border border-[#DFE1E6] divide-y divide-[#DFE1E6]">
                {f.subtasks.map((sub) => (
                  <Link
                    key={sub.id}
                    href={`/issues/${sub.key}`}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-[#F4F5F7] transition-colors"
                  >
                    <span className="text-xs text-[#0052CC] font-medium w-24 flex-shrink-0">{sub.key}</span>
                    <span className="text-sm text-[#172B4D] flex-1 truncate">{sub.fields.summary}</span>
                    <StatusBadge status={sub.fields.status} />
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Comments */}
          {f.comment && f.comment.comments.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold text-[#5E6C84] uppercase tracking-wider mb-3">
                Comments ({f.comment.comments.length})
              </h2>
              <div className="space-y-3">
                {f.comment.comments.slice(-5).map((c) => (
                  <div key={c.id} className="bg-white rounded-sm border border-[#DFE1E6] p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-semibold text-[#172B4D]">{c.author.displayName}</span>
                      <span className="text-xs text-[#5E6C84]">{formatDate(c.created)}</span>
                    </div>
                    <WikiRenderer content={c.body} />
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Right: Metadata sidebar */}
        <div className="space-y-4">
          <div className="bg-white rounded-sm border border-[#DFE1E6] p-4 space-y-4">
            {/* Status transition */}
            <div>
              <label className="text-xs font-semibold text-[#5E6C84] uppercase tracking-wider block mb-1.5">Status</label>
              <TransitionButton
                issueKey={issueKey}
                currentStatus={f.status.name}
                onTransitioned={() => mutate()}
              />
            </div>

            {/* Priority */}
            <div>
              <label className="text-xs font-semibold text-[#5E6C84] uppercase tracking-wider block mb-1.5">Priority</label>
              <div className="flex items-center gap-2">
                <PriorityIcon priority={f.priority} />
                <span className="text-sm text-[#172B4D]">{f.priority.name}</span>
              </div>
            </div>

            {/* Assignee */}
            <div>
              <label className="text-xs font-semibold text-[#5E6C84] uppercase tracking-wider block mb-1.5">Assignee</label>
              <span className="text-sm text-[#172B4D]">{f.assignee?.displayName || 'Unassigned'}</span>
            </div>

            {/* Reporter */}
            <div>
              <label className="text-xs font-semibold text-[#5E6C84] uppercase tracking-wider block mb-1.5">Reporter</label>
              <span className="text-sm text-[#172B4D]">{f.reporter.displayName}</span>
            </div>

            {/* Project */}
            <div>
              <label className="text-xs font-semibold text-[#5E6C84] uppercase tracking-wider block mb-1.5">Project</label>
              <span className="text-sm text-[#172B4D]">{f.project.name}</span>
            </div>

            {/* Parent */}
            {f.parent && (
              <div>
                <label className="text-xs font-semibold text-[#5E6C84] uppercase tracking-wider block mb-1.5">Parent</label>
                <Link href={`/issues/${f.parent.key}`} className="text-sm text-[#0052CC] hover:underline">
                  {f.parent.key}: {f.parent.fields.summary}
                </Link>
              </div>
            )}

            {/* Dates */}
            <div>
              <label className="text-xs font-semibold text-[#5E6C84] uppercase tracking-wider block mb-1.5">Created</label>
              <span className="text-sm text-[#172B4D]">{formatDate(f.created)}</span>
            </div>
            <div>
              <label className="text-xs font-semibold text-[#5E6C84] uppercase tracking-wider block mb-1.5">Updated</label>
              <span className="text-sm text-[#172B4D]">{formatDate(f.updated)}</span>
            </div>

            {/* Labels */}
            {f.labels && f.labels.length > 0 && (
              <div>
                <label className="text-xs font-semibold text-[#5E6C84] uppercase tracking-wider block mb-1.5">Labels</label>
                <div className="flex flex-wrap gap-1">
                  {f.labels.map((label) => (
                    <span key={label} className="text-xs bg-[#DFE1E6] text-[#42526E] px-2 py-0.5 rounded-sm">{label}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Test issue detail**

Navigate đến `/issues/HLU2-2585` → thấy:
- Summary hiển thị đúng
- Description render Jira wiki markup (bold, code blocks, lists)
- Sub-tasks list với link
- Sidebar metadata (status, priority, assignee, dates)
- Transition dropdown hoạt động

---

## Task 8: Final Verification + Git Init

- [ ] **Step 1: Chạy cả backend + frontend cùng lúc**

Terminal 1:
```bash
cd E:\SOURCE\jira\backend && npm run dev
```

Terminal 2:
```bash
cd E:\SOURCE\jira\frontend && npm run dev
```

- [ ] **Step 2: Full flow test**

1. Mở `http://localhost:3000` → redirect `/login`
2. Nhập `SangNT` / `Asc_SangNT2023` → redirect `/board`
3. Thấy 3 cột kanban với issues thực
4. Click một issue card → navigate đến detail
5. Thấy description render đúng
6. Click transition dropdown → chọn status mới → confirm thay đổi

- [ ] **Step 3: Git init**

```bash
cd E:\SOURCE\jira
git init
git add .gitignore
```

Tạo file `.gitignore`:
```
node_modules/
dist/
.env
.env.local
backend/data/
*.db
.next/
```

```bash
git add .
git commit -m "feat: MVP Phase 1 — Login, Board, Issue Detail"
```

---

## Sau Phase 1 — Phase 2 sẽ bao gồm:
- `/issues` — My Issues list với filter
- `/projects` — Projects browser
- `/settings` — Settings page
- Log Work modal
- Dark mode toggle
- AI architecture setup (endpoint skeleton)
