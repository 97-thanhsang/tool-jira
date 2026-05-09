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
    parent?: { key: string; fields: { summary: string; status: JiraStatus } };
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
