# Jira Power — Personal Jira UI with AI Features

> A fast, self-hosted Jira client with AI-powered issue summaries, smart search, and personal productivity features — built for developers who live in Jira.

![Screenshot](https://raw.githubusercontent.com/your-org/jira-power/main/docs/screenshot.png)

---

## ✨ Features

- **Jira Proxy** — Secure credential-free API calls through a local backend; your token never leaves your machine
- **Bookmarks** — Star and track issues across projects in one place
- **User Settings** — Persist preferences across sessions (stored locally in SQLite or PostgreSQL)
- **AI Issue Summaries** — Summarise long Jira issues with Google Gemini in one click
- **AI Sprint Planning** — Generate sprint descriptions and acceptance criteria from issue lists
- **Smart Search** — Fuzzy-search across bookmarks and recent issues
- **Board View** — Kanban-style board for a selected project/sprint
- **Dark Mode** — Full light/dark theme support via shadcn/ui

---

## 🚀 Quick Start

### Option 1 — Docker (Recommended)

> Requires [Docker Desktop](https://www.docker.com/products/docker-desktop/)

```bash
# 1. Clone the repository
git clone https://github.com/your-org/jira-power.git
cd jira-power

# 2. Copy env file and fill in your values
cp .env.example .env
# Edit .env — set JIRA_BASE_URL to your Jira instance

# 3. Start everything
docker-compose up --build
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

> **Note:** The backend connects to PostgreSQL automatically when running via Docker.
> For local SQLite dev, leave `DATABASE_URL` unset — see Option 2.

---

### Option 2 — Local Development

#### Prerequisites

| Tool | Version |
|------|---------|
| Node.js | ≥ 20 |
| npm | ≥ 10 |

#### Steps

```bash
# Clone
git clone https://github.com/your-org/jira-power.git
cd jira-power

# ── Backend ──────────────────────────────────────────────────────────────────
cd backend
cp .env.example .env
# Edit .env — set JIRA_BASE_URL (leave DATABASE_URL empty for SQLite)
npm install
npm run dev        # starts on http://localhost:3001

# ── Frontend (new terminal) ──────────────────────────────────────────────────
cd ../frontend
cp .env.example .env.local
# NEXT_PUBLIC_API_URL=http://localhost:3001 (already set)
npm install
npm run dev        # starts on http://localhost:3000
```

Open [http://localhost:3000](http://localhost:3000).

---

## 🤖 AI Features

AI features use [Google Gemini](https://ai.google.dev/). You need a free API key.

1. Go to [https://aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
2. Create a new API key
3. In the app, open **Settings → AI** and paste your key

> Your API key is stored only in your browser's local storage and sent directly with each AI request. It is **never** persisted on the server.

---

## ⚙️ Environment Variables

### Root `.env` (Docker Compose)

| Variable | Default | Description |
|----------|---------|-------------|
| `POSTGRES_USER` | `jirapower` | PostgreSQL username |
| `POSTGRES_PASSWORD` | `jirapower_secret` | PostgreSQL password |
| `POSTGRES_DB` | `jirapowerdb` | PostgreSQL database name |
| `JIRA_BASE_URL` | `https://task.ascvn.com.vn` | Your Jira instance base URL |

### Backend `.env`

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | Backend HTTP port |
| `JIRA_BASE_URL` | `https://task.ascvn.com.vn` | Your Jira instance base URL |
| `DATABASE_URL` | *(empty = SQLite)* | PostgreSQL connection string (optional) |

### Frontend `.env.local`

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:3001` | Backend API base URL |

---

## 🛠 Tech Stack

### Backend

| Technology | Role |
|-----------|------|
| Node.js 20 + TypeScript | Runtime & language |
| Express v5 | HTTP server |
| Drizzle ORM | Type-safe database queries |
| SQLite (better-sqlite3) | Default local database |
| PostgreSQL (pg) | Production database (Docker) |
| Google Generative AI SDK | AI features via Gemini |

### Frontend

| Technology | Role |
|-----------|------|
| Next.js 15 (App Router) | React framework |
| TypeScript | Language |
| shadcn/ui + Tailwind CSS v4 | UI components & styling |
| SWR | Data fetching & caching |
| Axios | HTTP client |
| Lucide React | Icon library |

---

## 📁 Project Structure

```
jira-power/
├── backend/                  # Node.js + Express API
│   ├── src/
│   │   ├── db/               # Drizzle ORM — SQLite + PostgreSQL
│   │   ├── routes/           # jira.ts (proxy), ai.ts (Gemini)
│   │   ├── config.ts         # Environment config
│   │   └── index.ts          # Express app entry
│   ├── Dockerfile
│   └── .env.example
├── frontend/                 # Next.js 15 app
│   ├── app/                  # App Router pages
│   ├── components/           # React components (shadcn/ui)
│   ├── lib/                  # API client, utilities
│   ├── Dockerfile
│   └── .env.example
├── docker-compose.yml        # Full-stack Docker setup
└── .env.example              # Root env for Docker Compose
```

---

## 🐳 Docker Details

The Docker Compose setup starts three services:

| Service | Port | Description |
|---------|------|-------------|
| `postgres` | (internal) | PostgreSQL 16 database |
| `backend` | 3001 | Express API + Drizzle ORM |
| `frontend` | 3000 | Next.js standalone app |

Data is persisted in named Docker volumes:
- `postgres_data` — PostgreSQL database files
- `backend_data` — SQLite fallback (unused when PostgreSQL is active)

---

## 📄 License

MIT © Jira Power Contributors
