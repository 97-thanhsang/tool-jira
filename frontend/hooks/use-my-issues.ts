import useSWR from 'swr';
import { api } from '@/lib/api';
import type { JiraIssue, JiraSearchResult } from '@/types/jira';

const fetcher = (url: string) =>
  api
    .get<JiraSearchResult>(url, {
      params: {
        jql: 'assignee = currentUser() AND resolution = Unresolved ORDER BY updated DESC',
        maxResults: 100,
        fields: 'summary,status,priority,issuetype,project,updated,created,assignee,reporter,duedate,labels,components,timetracking,sprint,customfield_10020',
      },
    })
    .then((r) => r.data);

export function useMyIssues() {
  const { data, error, isLoading, mutate } = useSWR('/search', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 30000,
  });

  const grouped = {
    todo:       [] as JiraIssue[],
    inProgress: [] as JiraIssue[],
    done:       [] as JiraIssue[],
  };

  data?.issues.forEach((issue) => {
    const cat = issue.fields.status.statusCategory.key;
    if (cat === 'new')                grouped.todo.push(issue);
    else if (cat === 'indeterminate') grouped.inProgress.push(issue);
    else if (cat === 'done')          grouped.done.push(issue);
  });

  return {
    grouped,
    total: data?.total ?? 0,
    isLoading,
    error,
    mutate,
  };
}
