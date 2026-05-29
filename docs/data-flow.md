# Data Flow — Jira Power

> Đọc file này khi cần hiểu auth flow, API call chain, AI flow, và localStorage strategy.
> Cập nhật lần cuối: 2026-05-29

---

## 1. Authentication Flow

```
User nhập username + password
    │
    ▼
FE: btoa(`${username}:${password}`) → base64 string
    │
    ▼
FE: api.get('/myself', { headers: { 'X-Jira-Auth': base64 } })
    │
    ▼
BE (jira.ts): nhận X-Jira-Auth, forward với Authorization: Basic <base64>
    │
    ▼
Jira REST API v2: verify credentials, trả về JiraUser object
    │
    ▼
FE: saveAuth(username, password, user)  (lib/api.ts)
    ├── localStorage.setItem('jira_auth', base64)
    └── localStorage.setItem('jira_user', JSON.stringify(user))
    │
    ▼
FE: router.replace('/board')
```

---

## 2. Jira API Call Flow

Sau khi login, mọi API request đều đi theo flow này:

```
SWR hook → api.get('/search?jql=...')
    │
    │  [Request interceptor — lib/api.ts]
    │  config.headers['X-Jira-Auth'] = localStorage.getItem('jira_auth')
    ▼
BE: GET /api/jira/search?jql=...
    │
    │  [jira.ts proxy]
    │  Authorization: Basic <từ X-Jira-Auth header>
    │  Forward: query params + body nguyên xi
    ▼
Jira: GET /rest/api/2/search?jql=...
    │
    ▼
BE: trả về response nguyên xi (status + body)
    │
    ▼
SWR cache → component render
```

---

## 3. AI Feature Flow

```
User click "AI Summary" / "Draft with AI" / v.v.
    │
    ▼
FE: lib/ai.ts
    ├── Đọc ai_api_key từ localStorage
    ├── Nếu không có key → throw Error('No AI API key configured')
    └── fetch('/api/ai/summarize', { headers: { 'X-AI-Key': apiKey }, body: payload })
    │
    ▼
BE (ai.ts): nhận X-AI-Key header
    ├── Nếu thiếu → 401
    └── GoogleGenerativeAI(apiKey).getGenerativeModel('gemini-2.5-flash')
    │
    ▼
Google Gemini API
    │
    ▼
BE: parse response, strip code fences nếu có, trả về JSON
    │
    ▼
FE: hiển thị kết quả (bullets / draft / timeSpent / suggestion / markdown)
```

**AI key KHÔNG bao giờ lưu trên server** — chỉ đi qua header từ browser đến backend, không persist.

---

## 4. Worklog Flow

```
User log work (từ Issue Detail hoặc Log Work modal):
    │
    ├── Gọi: lib/worklog-api.ts → addWorklog(payload)
    │       → POST /api/jira/issue/${key}/worklog
    │
    └── Lưu local cache: lib/worklogs.ts → saveWorklog(entry)
            → localStorage['recent_worklogs'] (max 20 entries)

Fetch worklog calendar:
    useWorklogs(filters) → worklog-api.fetchWorklogs(username, dateFrom, dateTo)
    → JQL: worklogDate >= from AND worklogDate <= to AND worklogAuthor = username
    → Flatten + filter theo date range + user
    → Trả về WorklogSearchResult với entriesByDate map
```

---

## 5. Optimistic Update Pattern

Dùng trong drag-drop board, transitions, worklog mutations:

```typescript
// 1. Optimistic update ngay lập tức (UI phản hồi)
setLocalOverride(optimisticValue);

// 2. Gọi API
await api.post('/issue/KEY/transitions', { transition: { id } });

// 3a. Thành công → trigger SWR refetch (confirm real data)
mutate();

// 3b. Thất bại → revert optimistic update
setLocalOverride(originalValue);
showToast('error message', 'error');
```

---

## 6. 401 Handling

```
Bất kỳ response 401 nào từ Jira:
    │
    ▼  [Response interceptor — lib/api.ts]
clearAuth()  →  xóa localStorage ('jira_auth', 'jira_user')
    │
    ▼
window.location.href = '/login'
```

---

## 7. localStorage Keys

| Key | Giá trị | Khi set | Khi xóa |
|-----|---------|---------|---------|
| `jira_auth` | base64(`username:password`) | Sau login thành công | Logout hoặc 401 |
| `jira_user` | JSON string của `JiraUser` | Sau login thành công | Logout hoặc 401 |
| `ai_api_key` | Google Gemini API key (plain text) | Settings page | User xóa thủ công |
| `recent_issues` | JSON array `JiraIssue[]` (max 10) | Khi user navigate tới issue | — |
| `recent_worklogs` | JSON array `WorklogEntry[]` (max 20) | Khi user log work | — |
| `dark_mode` | `'true'` / `'false'` | Settings toggle | — |

**⚠️ QUAN TRỌNG:** Không bao giờ đọc localStorage trong render body → hydration mismatch.
```typescript
// ❌ WRONG — SSR sẽ crash
const user = getStoredUser();

// ✅ CORRECT — chỉ đọc sau mount
const [user, setUser] = useState(null);
useEffect(() => { setUser(getStoredUser()); }, []);
```

---

## 8. SWR Cache Strategy

```typescript
// Config chuẩn cho tất cả hooks
{
  revalidateOnFocus: false,    // Không refetch khi tab được focus
  dedupingInterval: 30000,     // Cache 30s, tránh duplicate requests
}

// Invalidate sau mutation
const { mutate } = useIssue(key);
await api.post('/issue/KEY/transitions', payload);
mutate();  // trigger re-fetch từ Jira
```

**SWR key uniqueness** — mỗi hook PHẢI dùng key riêng:
- `use-my-issues` → key: `/search`
- `use-issues-list` → key: `/search-issues-list`  ← khác để tránh collision
- `use-search` → key: `['search-palette', query]`
- `use-worklogs` → key: `['worklogs', user, from, to, project]`

---

## 9. API URL Mapping

| Frontend gọi (axios) | Backend nhận | Jira nhận |
|---------------------|-------------|----------|
| `/search` | `/api/jira/search` | `/rest/api/2/search` |
| `/myself` | `/api/jira/myself` | `/rest/api/2/myself` |
| `/issue/KEY` | `/api/jira/issue/KEY` | `/rest/api/2/issue/KEY` |
| `/issue/KEY/transitions` | `/api/jira/issue/KEY/transitions` | `/rest/api/2/issue/KEY/transitions` |
| `/issue/KEY/worklog` | `/api/jira/issue/KEY/worklog` | `/rest/api/2/issue/KEY/worklog` |
| `/issue/KEY/comment` | `/api/jira/issue/KEY/comment` | `/rest/api/2/issue/KEY/comment` |
| `/project` | `/api/jira/project` | `/rest/api/2/project` |
| *(agile)* `/agile/board` | `/api/jira/agile/board` | `/rest/agile/1.0/board` |

---

## 10. Error States

| Scenario | Xử lý |
|---------|-------|
| 401 từ Jira | Auto logout → redirect /login |
| Network error | SWR: `error` state → component hiện error UI |
| 404 issue key | Issue Detail: hiện "Issue not found" |
| 403 no permission | Hiện lỗi từ Jira response |
| AI key thiếu | `throw Error('No AI API key configured')` → component hiện toast |
| AI key sai | Backend trả 400 từ Gemini → FE hiện error toast |
