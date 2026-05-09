import useSWR from 'swr';
import { api } from '@/lib/api';
import type { JiraSearchResult } from '@/types/jira';

export interface IssueFilters {
  text?: string;
  status?: string;        // 'new' | 'indeterminate' | 'done'
  priority?: string;      // 'Highest' | 'High' | 'Medium' | 'Low' | 'Lowest'
  project?: string;       // project key
  issuetype?: string;     // 'Bug' | 'Task' | 'Story' | 'Sub-task' | 'Epic'
  assignee?: string;      // 'currentUser()' | username
  labels?: string;        // single label string
  updatedAfter?: string;  // '-1d' | '-7d' | '-30d' | ''
  duedate?: string;       // 'overdue' | 'this_week' | 'next_week' | ''
  startAt?: number;
}

function buildJql(filters: IssueFilters): string {
  const parts: string[] = ['resolution = Unresolved'];

  if (filters.text) parts.push(`text ~ "${filters.text}"`);

  if (filters.status === 'new') parts.push('statusCategory = "To Do"');
  else if (filters.status === 'indeterminate')
    parts.push('statusCategory = "In Progress"');
  else if (filters.status === 'done') parts.push('statusCategory = "Done"');

  if (filters.priority) parts.push(`priority = "${filters.priority}"`);
  if (filters.project) parts.push(`project = "${filters.project}"`);
  if (filters.issuetype) parts.push(`issuetype = "${filters.issuetype}"`);
  if (filters.labels) parts.push(`labels = "${filters.labels}"`);

  // Assignee filter: 'currentUser()' = Me, 'EMPTY' = Unassigned, undefined = all
  if (filters.assignee === 'currentUser()') parts.push('assignee = currentUser()');
  else if (filters.assignee === 'EMPTY') parts.push('assignee is EMPTY');

  if (filters.updatedAfter === '-1d') parts.push('updated >= "-1d"');
  else if (filters.updatedAfter === '-7d') parts.push('updated >= "-7d"');
  else if (filters.updatedAfter === '-30d') parts.push('updated >= "-30d"');

  if (filters.duedate === 'overdue')
    parts.push('duedate < now() AND duedate is not EMPTY');
  else if (filters.duedate === 'this_week')
    parts.push('duedate >= startOfWeek() AND duedate <= endOfWeek()');
  else if (filters.duedate === 'next_week')
    parts.push('duedate >= startOfWeek(1) AND duedate <= endOfWeek(1)');

  return parts.join(' AND ') + ' ORDER BY updated DESC';
}

const PAGE_SIZE = 25;

export function useIssuesList(filters: IssueFilters = {}) {
  const swrKey = JSON.stringify({ ...filters, startAt: filters.startAt ?? 0 });

  const { data, error, isLoading, mutate } = useSWR(
    swrKey,
    () =>
      api
        .get<JiraSearchResult>('/search', {
          params: {
            jql: buildJql(filters),
            maxResults: PAGE_SIZE,
            startAt: filters.startAt ?? 0,
            fields:
              'summary,status,priority,issuetype,project,updated,assignee,labels,duedate',
          },
        })
        .then((r) => r.data),
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000,
    }
  );

  return {
    issues: data?.issues ?? [],
    total: data?.total ?? 0,
    isLoading,
    error,
    mutate,
  };
}
