# Jira Power UI — Lovable.dev Prompt

## Project Overview

Build a full-stack web application that serves as a faster, more powerful alternative UI for our company Jira instance at `https://task.ascvn.com.vn/`. The app connects to the Jira REST API v2 and provides a clean, familiar interface styled closely after Atlassian's design system.

---

## Design System

- **Style:** Clone Atlassian/Jira design language as closely as possible
- **Primary color:** `#0052CC` (Atlassian Blue)
- **Secondary color:** `#0065FF`
- **Background (light):** `#F4F5F7`
- **Surface:** `#FFFFFF`
- **Text primary:** `#172B4D`
- **Text secondary:** `#5E6C84`
- **Success:** `#36B37E`
- **Warning:** `#FFAB00`
- **Danger:** `#DE350B`
- **Font:** Inter or Atlassian's font stack (system-ui fallback)
- **Layout:** Left sidebar navigation + main content area (same as Jira)
- **Border radius:** 3px (Jira style, not overly rounded)
- **Support light/dark mode toggle**

---

## Tech Stack

- **Frontend:** React + TypeScript + Tailwind CSS
- **State management:** React Context or Zustand
- **HTTP client:** Axios with interceptors for auth headers
- **Routing:** React Router v6
- **Icons:** Lucide React (closest to Atlassian icons)
- **Markdown/Wiki render:** Use `react-markdown` + custom parser for Jira wiki markup (`{*}bold{*}`, `{code}...{code}`, `!image.png!`, `h2.`, etc.)

---

## Authentication

- **Login page** at `/login`
- Form fields: `Jira Server URL` (default: `https://task.ascvn.com.vn`), `Username`, `Password`
- On submit: call `GET /rest/api/2/myself` with Basic Auth to verify credentials
- On success: store credentials in `localStorage` (base64 encoded for Basic Auth header)
- All subsequent API calls use `Authorization: Basic <base64(username:password)>` header
- Protected routes: redirect to `/login` if not authenticated
- Logout: clear localStorage and redirect to `/login`

---

## Pages & Features

### 1. `/login` — Login Page

- Jira-style login form with logo placeholder
- Fields: Server URL, Username, Password
- "Remember me" checkbox
- Error handling: show inline error if credentials invalid
- Loading state during authentication
- Redirect to `/board` on success

---

### 2. `/board` — My Board (Home / Default after login)

**Kanban board showing ALL issues currently assigned to the logged-in user.**

- Call: `GET /rest/api/2/search?jql=assignee=currentUser() AND resolution=Unresolved ORDER BY updated DESC&maxResults=100`
- 3 columns: **To Do**, **In Progress**, **Done** (group by `status.statusCategory`)
- Each card shows:
  - Issue key (e.g., `HLU2-2585`) — clickable → opens Issue Detail
  - Summary (truncated at 2 lines)
  - Project name badge
  - Priority icon (colored dot or Jira priority icons)
  - Issue type icon (Story / Sub-task / Bug)
  - Status badge
- **Quick actions on card hover:**
  - Transition status button (arrow right to next status)
  - Open in original Jira (external link icon)
- **Board header:** total count per column, refresh button, filter by project dropdown
- Drag-and-drop between columns is a **bonus** (not required for MVP)

---

### 3. `/issues` — My Issues List

**Full list view of all assigned issues with rich filtering.**

- Default call: `GET /rest/api/2/search?jql=assignee=currentUser() AND resolution=Unresolved ORDER BY updated DESC`
- **Filters panel (left or top):**
  - Project: multi-select dropdown (load all projects from `/rest/api/2/project`)
  - Status: multi-select (To Do, In Progress, In Developing, Done, etc.)
  - Priority: multi-select (Highest, High, Medium, Low, Lowest)
  - Issue Type: Story, Sub-task, Bug, Task
  - Text search: filter by summary keyword (client-side or via JQL `text ~ "keyword"`)
- **Table columns:**
  - Type icon | Key | Summary | Project | Status | Priority | Updated
- Clicking a row → navigates to `/issues/:key`
- Pagination: 50 per page with load more or page navigation
- Sort by clicking column headers

---

### 4. `/issues/:key` — Issue Detail

**Full detail view of a single issue.**

- Call: `GET /rest/api/2/issue/{key}?expand=renderedFields,changelog`
- **Left column (70%):**
  - Issue key + Summary (large, editable on click — optional for MVP)
  - Description: **render Jira wiki markup properly**:
    - `{*}text{*}` → **bold**
    - `_text_` → *italic*
    - `{code:typescript}...{code}` → syntax-highlighted code block
    - `!image.png|width=500!` → show image placeholder or load from Jira attachment URL
    - `h1.`, `h2.`, `h3.` → headings
    - Numbered lists and bullet points
    - `[link text|url]` → hyperlinks
  - **Sub-tasks section:** list of sub-tasks with key, summary, status badge; click → navigate
  - **Attachments section:** list filenames
  - **Comments section:** list comments with author + timestamp

- **Right sidebar (30%):**
  - Status badge + **transition dropdown**: call `/rest/api/2/issue/{key}/transitions` and show available transitions; on select → `POST /rest/api/2/issue/{key}/transitions`
  - Assignee avatar + name
  - Reporter name
  - Priority badge
  - Created / Updated dates
  - Project name (linked to `/projects/{key}`)
  - Parent issue link (if sub-task)
  - Labels
  - **Log Work button** → modal with: Time Spent (e.g., "2h 30m"), Start Date, Comment → `POST /rest/api/2/issue/{key}/worklog`
  - **Open in Jira** button → external link to `https://task.ascvn.com.vn/browse/{key}`

---

### 5. `/projects` — Projects Browser

**Browse all 128+ projects in the Jira instance.**

- Call: `GET /rest/api/2/project`
- **Search bar** at top: filter project list by name or key (client-side)
- **Project category filter:** EMS.ONGOING, EMS.MAINT, EMS.CR, DEPARTMENT, PRODUCT, PAYMENT, etc.
- Grid or list of project cards showing:
  - Project avatar (colored square if no image)
  - Project name
  - Project key badge
  - Category label
- Clicking a project → navigates to `/projects/:projectKey`

#### `/projects/:projectKey` — Project Issues

- Call: `GET /rest/api/2/search?jql=project={key} AND assignee=currentUser() ORDER BY updated DESC`
- Shows issues in this project assigned to current user
- Same table layout as `/issues`
- Back button to `/projects`

---

### 6. `/settings` — Settings

- **Jira Server URL:** editable field (default `https://task.ascvn.com.vn`)
- **Account info:** show current logged-in user (displayName, email, avatar from `/rest/api/2/myself`)
- **Theme toggle:** Light / Dark mode
- **Clear credentials / Logout** button
- **About:** app version, link to Jira instance

---

## Sidebar Navigation

Left sidebar (collapsed by default on mobile, expanded on desktop):

```
[Avatar] Sang Nguyen Thanh
─────────────────────────
📌 My Board
📋 My Issues
🗂️ Projects
─────────────────────────
⚙️ Settings
🔗 Open Jira
```

- Active state: blue left border + highlighted background (Jira style)
- Collapsible with toggle button

---

## API Integration Details

**Base URL:** `https://task.ascvn.com.vn/rest/api/2`

**Common endpoints used:**
| Endpoint | Method | Usage |
|----------|--------|-------|
| `/myself` | GET | Auth check + user info |
| `/search?jql=...` | GET | Query issues |
| `/issue/{key}` | GET | Issue detail |
| `/issue/{key}/transitions` | GET | Get available transitions |
| `/issue/{key}/transitions` | POST | Change issue status |
| `/issue/{key}/worklog` | POST | Log work |
| `/issue/{key}/comment` | GET | Get comments |
| `/project` | GET | All projects |

**CORS Note:** Since the Jira server is at a different origin, all API calls must be proxied through a backend. Set up a simple Express/Node.js proxy or use Supabase Edge Functions to forward requests to the Jira server with credentials.

---

## Error Handling

- Network errors: show toast notification "Connection error. Please check your internet connection."
- 401 Unauthorized: clear auth and redirect to `/login`
- 403 Forbidden: show "You don't have permission to view this"
- 404: show "Issue not found" with back button
- 500: show "Jira server error. Please try again."
- Loading states: skeleton loaders for lists, spinner for actions

---

## Responsive Design

- Desktop (1280px+): full sidebar + content
- Tablet (768-1280px): collapsed sidebar with icons only
- Mobile (< 768px): hamburger menu, stacked layout

---

## Non-Goals (Not in MVP)

- Creating new issues (only view/update existing)
- Sprint management / Backlog
- Advanced reporting / dashboards
- Real-time updates (no WebSocket)
- File upload for attachments

---

## Additional Notes

- All dates: format as `DD/MM/YYYY HH:mm` (Vietnamese locale)
- Time zones: `Asia/Ho_Chi_Minh`
- Jira wiki markup in descriptions is critical to render properly — this is a key differentiator
- The app should feel fast: cache project list in localStorage (refresh every 1 hour), cache issue list results briefly
