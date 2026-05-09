# Data Flow — Tool-Jira

> Đọc file này khi cần hiểu cách auth hoạt động, API được gọi như thế nào, và data chảy từ đâu đến đâu.
> Cập nhật lần cuối: 2026-05-10

---

## 1. Authentication Flow

```
User nhập username/password
    │
    ▼
FE: btoa(`${username}:${password}`) → base64 string
    │
    ▼
FE: api.get('/myself', { headers: { 'X-Jira-Auth': base64 } })
    │
    ▼
BE: nhận X-Jira-Auth, forward với Authorization: Basic <base64>
    │
    ▼
Jira: verify credentials, trả về JiraUser object
    │
    ▼
FE: saveAuth(username, password, user)
    ├── localStorage.setItem('jira_auth', base64)
    └── localStorage.setItem('jira_user', JSON.stringify(user))
    │
    ▼
FE: router.replace('/board')
```

---

## 2. Subsequent API Calls

Sau khi login, mọi request đều tự động gắn auth:

```
SWR hook → api.get('/search?jql=...')
    │
    │ Request interceptor (lib/api.ts):
    │   config.headers['X-Jira-Auth'] = localStorage.getItem('jira_auth')
    ▼
BE: /api/jira/search?jql=...
    │
    │ jira.ts route:
    │   Authorization: Basic <từ X-Jira-Auth header>
    ▼
Jira: /rest/api/2/search?jql=...
    │
    ▼
BE: trả về response nguyên xi
    │
    ▼
SWR cache + component render
```

---

## 3. 401 Handling

```
Bất kỳ response 401 nào:
    │
    ▼ (Response interceptor trong lib/api.ts)
clearAuth()  →  xóa localStorage
    │
    ▼
window.location.href = '/login'
```

---

## 4. localStorage Keys

| Key | Giá trị | Khi set | Khi xóa |
|-----|---------|---------|---------|
| `jira_auth` | base64(`username:password`) | Sau login thành công | Logout hoặc 401 |
| `jira_user` | JSON string của JiraUser | Sau login thành công | Logout hoặc 401 |

**⚠️ Không bao giờ đọc localStorage trực tiếp trong render body.** Luôn dùng `useEffect` để tránh hydration mismatch (SSR trả null, client trả data → crash).

```typescript
// ❌ WRONG — gây hydration error
const user = getStoredUser(); // đọc trực tiếp trong component

// ✅ CORRECT
const [user, setUser] = useState(null);
useEffect(() => { setUser(getStoredUser()); }, []);
```

---

## 5. SWR Cache Strategy

```typescript
// use-my-issues.ts
{
  revalidateOnFocus: false,    // không refetch khi tab được focus lại
  dedupingInterval: 30000,     // cache 30 giây, tránh duplicate requests
}

// Invalidate cache sau mutation (transition, log work, comment):
const { mutate } = useIssue(key);
await api.post(...)
mutate()  // trigger re-fetch
```

---

## 6. API URL Mapping

| Frontend gọi | Backend nhận | Jira nhận |
|-------------|-------------|----------|
| `/search` | `/api/jira/search` | `/rest/api/2/search` |
| `/issue/PROJ-123` | `/api/jira/issue/PROJ-123` | `/rest/api/2/issue/PROJ-123` |
| `/issue/PROJ-123/transitions` | `/api/jira/issue/PROJ-123/transitions` | `/rest/api/2/issue/PROJ-123/transitions` |
| `/issue/PROJ-123/worklog` | `/api/jira/issue/PROJ-123/worklog` | `/rest/api/2/issue/PROJ-123/worklog` |
| `/myself` | `/api/jira/myself` | `/rest/api/2/myself` |

---

## 7. Error States

| Scenario | Xử lý |
|---------|-------|
| 401 từ Jira | Auto logout → redirect /login |
| Network error | SWR: `error` state, component show error UI |
| 404 issue key | Issue Detail: hiển thị "Issue not found" |
| 403 no permission | Hiển thị lỗi từ Jira response |
