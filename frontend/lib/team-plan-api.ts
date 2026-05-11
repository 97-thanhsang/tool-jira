import { api } from './api';
import type { TaskReport, UserReport, TeamReportData } from '@/types/jira';

interface SubTaskIssue {
  key: string;
  fields: {
    summary: string;
    issuetype: { name: string; iconUrl: string };
    project: { key: string; name: string };
    timetracking?: { originalEstimateSeconds: number };
    status: { name: string };
    priority: { name: string } | null;
    duedate: string | null;
    assignee: { name: string; displayName: string } | null;
  };
}

function formatDuration(seconds: number): string {
  if (seconds === 0) return '-';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h >= 8 && h % 8 === 0 && m === 0) return `${h / 8}d`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export async function fetchTeamPlan(
  usernames: string[],
  dateFrom?: string,
  dateTo?: string,
  allUsers: boolean = false,
): Promise<TeamReportData> {
  if (usernames.length === 0 && !allUsers) return { users: [], dateRange: { from: '', to: '' }, totalEstSeconds: 0, totalLoggedSeconds: 0, userCount: 0, taskCount: 0 };

  let jql: string;
  const baseJql = allUsers
    ? 'issuetype = "Sub-task" AND resolution = Unresolved AND duedate is not EMPTY'
    : `assignee IN (${usernames.map(u => `"${u}"`).join(', ')}) AND issuetype = "Sub-task" AND resolution = Unresolved AND duedate is not EMPTY`;

  if (dateFrom && dateTo) {
    jql = `${baseJql} AND duedate >= "${dateFrom}" AND duedate <= "${dateTo}" ORDER BY duedate ASC`;
  } else {
    jql = `${baseJql} ORDER BY duedate ASC`;
  }

  const r = await api.get<{ issues: SubTaskIssue[] }>('/search', {
    params: {
      jql,
      maxResults: 2000,
      fields: 'summary,issuetype,project,timetracking,status,priority,duedate,assignee',
    },
  });

  // Build UserReport[] — group by assignee → project → issue
  // dailySeconds = estimate amount on the due date
  const userMap = new Map<string, UserReport>();

  for (const issue of r.data.issues ?? []) {
    const uname = issue.fields.assignee?.name;
    if (!uname) continue;

    if (!userMap.has(uname)) {
      userMap.set(uname, {
        username: uname,
        displayName: issue.fields.assignee?.displayName ?? uname,
        avatarUrl: '',
        tasks: [],
        totalEstSeconds: 0,
        totalEstDisplay: '',
        totalLoggedSeconds: 0,
        totalLoggedDisplay: '',
      });
    }

    const user = userMap.get(uname)!;
    const est = issue.fields.timetracking?.originalEstimateSeconds ?? 0;
    const duedate = issue.fields.duedate;

    const task: TaskReport = {
      issueKey: issue.key,
      issueId: '',
      summary: issue.fields.summary,
      issueTypeName: issue.fields.issuetype?.name ?? 'Sub-task',
      issueTypeIconUrl: issue.fields.issuetype?.iconUrl ?? '',
      projectKey: issue.fields.project.key,
      estSeconds: est,
      estDisplay: formatDuration(est),
      totalLoggedSeconds: est,
      totalLoggedDisplay: formatDuration(est),
      dailySeconds: duedate ? { [duedate]: est } : {},
      status: issue.fields.status?.name ?? '',
      priority: issue.fields.priority?.name ?? 'Medium',
      duedate: duedate ?? undefined,
    };

    user.tasks.push(task);
    user.totalEstSeconds += est;
  }

  const users = Array.from(userMap.values())
    .map((u) => ({
      ...u,
      totalEstDisplay: formatDuration(u.totalEstSeconds),
      totalLoggedDisplay: formatDuration(u.totalEstSeconds),
      tasks: u.tasks.sort((a, b) => {
        if (a.projectKey !== b.projectKey) return a.projectKey.localeCompare(b.projectKey);
        return b.totalLoggedSeconds - a.totalLoggedSeconds;
      }),
    }))
    .sort((a, b) => b.totalEstSeconds - a.totalEstSeconds);

  const totalEst = users.reduce((s, u) => s + u.totalEstSeconds, 0);

  return {
    users,
    dateRange: { from: '', to: '' },
    totalEstSeconds: totalEst,
    totalLoggedSeconds: totalEst,
    userCount: users.length,
    taskCount: users.reduce((s, u) => s + u.tasks.length, 0),
  };
}
