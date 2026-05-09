import useSWR from 'swr';
import { api } from '@/lib/api';
import type { JiraSearchResult } from '@/types/jira';

const fetcher = () =>
  api
    .get<JiraSearchResult>('/search', {
      params: {
        jql: 'assignee = currentUser() AND resolution = Unresolved ORDER BY updated DESC',
        maxResults: 100,
        fields: 'summary,status,priority,issuetype,project,updated',
      },
    })
    .then((r) => r.data);

export function useIssuesList() {
  const { data, error, isLoading, mutate } = useSWR(
    '/search-issues-list',
    fetcher,
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
