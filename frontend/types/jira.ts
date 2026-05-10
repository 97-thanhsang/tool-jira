export interface JiraUser {
  name: string;
  displayName: string;
  emailAddress: string;
  avatarUrls: { '48x48': string; '24x24': string };
}

export interface JiraStatus {
  id: string;
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

export interface JiraAttachment {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  created: string;
  content: string;    // full download URL (from Jira, not our proxy)
  thumbnail?: string; // thumbnail URL (only for images)
  author: JiraUser;
}

export interface JiraTimeTracking {
  originalEstimate?: string;
  remainingEstimate?: string;
  timeSpent?: string;
  originalEstimateSeconds?: number;
  remainingEstimateSeconds?: number;
  timeSpentSeconds?: number;
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
    duedate?: string;
    subtasks?: JiraIssue[];
    parent?: { key: string; fields: { summary: string; status: JiraStatus } };
    labels: string[];
    comment?: { comments: JiraComment[] };
    attachment?: JiraAttachment[];
    timetracking?: JiraTimeTracking;
    fixVersions?: Array<{ id: string; name: string; released: boolean }>;
    components?: Array<{ id: string; name: string }>;
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

export interface JiraProject {
  id: string;
  key: string;
  name: string;
  projectTypeKey?: string;
}

export interface JiraBoard {
  id: number;
  name: string;
  type: 'kanban' | 'scrum';
  self?: string;
}

export interface JiraBoardColumnConfig {
  name: string;
  statuses: Array<{ id: string; self?: string }>;
  min?: number;
  max?: number;
}

export interface JiraBoardConfig {
  id: number;
  name: string;
  type: 'kanban' | 'scrum';
  self: string;
  filter: { id: string; self: string };
  subQuery?: { query: string };
  columnConfig: {
    columns: JiraBoardColumnConfig[];
    constraintType: string;
  };
  ranking: Record<string, unknown>;
}

// ── Worklog Calendar ──

export interface WorklogAuthor {
  accountId?: string;
  name: string;
  displayName: string;
  avatarUrls?: { '24x24': string };
}

export interface WorklogEntry {
  id: string;
  issueId: string;
  issueKey: string;
  issueSummary: string;
  projectKey: string;
  projectName: string;
  author: WorklogAuthor;
  timeSpent: string;           // "2h 30m"
  timeSpentSeconds: number;    // 9000
  started: string;             // "2026-05-06T08:30:00.000+0700"
  comment: string;
  created: string;
  updated: string;
}

export interface WorklogFilters {
  username: string;
  dateFrom: string;            // "2026-05-01"
  dateTo: string;              // "2026-05-31"
  project?: string;
}

export interface WorklogCreatePayload {
  issueKey: string;
  timeSpentSeconds: number;
  comment: string;
  started: string;
}

export interface WorklogSearchResult {
  entries: WorklogEntry[];
  total: number;
  totalHours: number;
  dailyHours: Record<string, number>; // "2026-05-06" → 8
}
