'use client';
import useSWR from 'swr';
import { fetchTeamPlan } from '@/lib/team-plan-api';
import type { TeamReportData } from '@/types/jira';

interface UseTeamPlanParams {
  usernames: string[];
  dateFrom?: string;
  dateTo?: string;
  allUsers?: boolean;
}

export function useTeamPlan(params: UseTeamPlanParams | null) {
  const usernames = params?.usernames;
  const dateFrom = params?.dateFrom;
  const dateTo = params?.dateTo;
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

  return { data, isLoading, error };
}
