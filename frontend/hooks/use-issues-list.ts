import useSWR from 'swr';
import { api } from '@/lib/api';
import type { JiraSearchResult } from '@/types/jira';

export interface IssueFilters {
  text?: string;
  status?: string;        // 'new' | 'indeterminate' | 'done'
  priority?: string;      // priority name
  project?: string;       // project key
  issuetype?: string;     // issue type name
  assignee?: string;      // 'currentUser()' | 'EMPTY' | username
  labels?: string;        // single label string
  updatedAfter?: string;  // '-1d' | '-7d' | '-30d' | ''
  duedate?: string;       // 'overdue' | 'this_week' | 'next_week' | ''
  startAt?: number;
  // ── New filter fields ──
  reporter?: string;      // 'currentUser()' | username (no EMPTY variant)
  resolution?: string;    // resolution name, 'all', or undefined (defaults Unresolved)
  sprint?: string;        // sprint name
  component?: string;     // component name
  fixVersion?: string;    // fix version name
  createdAfter?: string;  // '-1d' | '-7d' | '-30d' | '-90d'
  // ── Sorting ──
  sortField?: string;     // JQL field name e.g. 'updated', 'duedate', 'priority'
  sortDir?: 'ASC' | 'DESC';
}

function buildJql(filters: IssueFilters): string {
  const parts: string[] = [];

  // ── Resolution logic (moved from hardcoded default) ──
  if (filters.resolution === 'all') {
    // Show all — no resolution constraint
  } else if (filters.resolution && filters.resolution !== 'Unresolved') {
    parts.push(`resolution = "${filters.resolution}"`);
  } else {
    // Default: only unresolved
    parts.push('resolution = Unresolved');
  }

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
  else if (filters.assignee) parts.push(`assignee = "${filters.assignee}"`);

  // Reporter filter: 'currentUser()' → no quotes, else username string
  if (filters.reporter === 'currentUser()') parts.push('reporter = currentUser()');
  else if (filters.reporter) parts.push(`reporter = "${filters.reporter}"`);

  if (filters.sprint) parts.push(`sprint = "${filters.sprint}"`);
  if (filters.component) parts.push(`component = "${filters.component}"`);
  if (filters.fixVersion) parts.push(`fixVersion = "${filters.fixVersion}"`);

  if (filters.updatedAfter === '-1d') parts.push('updated >= "-1d"');
  else if (filters.updatedAfter === '-7d') parts.push('updated >= "-7d"');
  else if (filters.updatedAfter === '-30d') parts.push('updated >= "-30d"');

  if (filters.createdAfter === '-1d') parts.push('created >= "-1d"');
  else if (filters.createdAfter === '-7d') parts.push('created >= "-7d"');
  else if (filters.createdAfter === '-30d') parts.push('created >= "-30d"');
  else if (filters.createdAfter === '-90d') parts.push('created >= "-90d"');

  if (filters.duedate === 'overdue')
    parts.push('duedate < now() AND duedate is not EMPTY');
  else if (filters.duedate === 'this_week')
    parts.push('duedate >= startOfWeek() AND duedate <= endOfWeek()');
  else if (filters.duedate === 'next_week')
    parts.push('duedate >= startOfWeek(1) AND duedate <= endOfWeek(1)');

  const orderField = filters.sortField ?? 'updated';
  const orderDir = filters.sortDir ?? 'DESC';
  return (parts.length ? parts.join(' AND ') : '') + ` ORDER BY ${orderField} ${orderDir}`;
}

export function useIssuesList(filters: IssueFilters = {}) {
  const swrKey = JSON.stringify(filters);

  const { data, error, isLoading, mutate } = useSWR(
    swrKey,
    () =>
      api
        .get<JiraSearchResult>('/search', {
          params: {
            jql: buildJql(filters),
            maxResults: 500,
            fields:
              'summary,status,priority,issuetype,project,updated,created,assignee,reporter,labels,duedate,resolution,fixVersions,components,sprint,timetracking',
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
