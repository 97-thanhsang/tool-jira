'use client';
import useSWR from 'swr';
import { useMemo } from 'react';
import { fetchWorklogs } from '@/lib/worklog-api';
import type { WorklogFilters, WorklogEntry } from '@/types/jira';

export function useWorklogs(filters: WorklogFilters | null) {
  const key = filters
    ? ['worklogs', filters.username, filters.dateFrom, filters.dateTo, filters.project]
    : null;

  const { data, error, isLoading, mutate } = useSWR(
    key,
    async ([, username, dateFrom, dateTo]: string[]) => {
      const result = await fetchWorklogs(username, dateFrom, dateTo);
      if (filters?.project) {
        result.entries = result.entries.filter(e => e.projectKey === filters.project);
        result.total = result.entries.length;
        result.totalHours = result.entries.reduce((s, e) => s + e.timeSpentSeconds / 3600, 0);
        result.dailyHours = {};
        for (const e of result.entries) {
          const d = new Date(e.started).toISOString().slice(0, 10);
          result.dailyHours[d] = (result.dailyHours[d] ?? 0) + e.timeSpentSeconds / 3600;
        }
      }
      return result;
    },
    { revalidateOnFocus: false, dedupingInterval: 30_000 },
  );

  const entriesByDate = useMemo(() => {
    if (!data?.entries) return {} as Record<string, WorklogEntry[]>;
    const map: Record<string, WorklogEntry[]> = {};
    for (const e of data.entries) {
      const d = new Date(e.started).toISOString().slice(0, 10);
      (map[d] ??= []).push(e);
    }
    return map;
  }, [data]);

  return { data, entriesByDate, isLoading, error, mutate };
}
