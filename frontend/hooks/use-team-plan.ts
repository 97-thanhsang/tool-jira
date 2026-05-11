'use client';
import useSWR from 'swr';
import { useMemo } from 'react';
import { fetchTeamPlan } from '@/lib/team-plan-api';
import type { TeamReportData } from '@/types/jira';

interface UseTeamPlanParams {
  usernames: string[];
  dateFrom?: string;
  dateTo?: string;
  project?: string;
  allUsers?: boolean;
}

export function useTeamPlan(params: UseTeamPlanParams | null) {
  const usernames = params?.usernames;
  const dateFrom = params?.dateFrom;
  const dateTo = params?.dateTo;
  const project = params?.project;
  const allUsers = params?.allUsers ?? false;

  const key =
    allUsers || (usernames && usernames.length > 0)
      ? ['team-plan', allUsers ? 'all' : usernames, dateFrom, dateTo]
      : null;

  const {
    data,
    error,
    isLoading,
  } = useSWR<TeamReportData>(
    key,
    () => fetchTeamPlan(usernames ?? [], dateFrom, dateTo, allUsers),
    { revalidateOnFocus: false, dedupingInterval: 30_000 },
  );

  // Client-side project filter
  const filteredData = useMemo(() => {
    if (!data) return undefined;
    if (!project) return data;
    const users = data.users
      .map(u => ({
        ...u,
        tasks: u.tasks.filter(t => t.projectKey === project),
      }))
      .filter(u => u.tasks.length > 0);
    return {
      ...data,
      users,
      taskCount: users.reduce((s, u) => s + u.tasks.length, 0),
      totalEstSeconds: users.reduce((s, u) => s + u.tasks.reduce((t, task) => t + task.estSeconds, 0), 0),
      totalLoggedSeconds: users.reduce((s, u) => s + u.tasks.reduce((t, task) => t + task.totalLoggedSeconds, 0), 0),
      userCount: users.length,
    };
  }, [data, project]);

  return { data: filteredData, isLoading, error };
}
