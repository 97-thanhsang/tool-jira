'use client';
import useSWR from 'swr';
import { api } from '@/lib/api';
import type { JiraStatus } from '@/types/jira';

export interface StatusColumnEntry {
  name: string;
  wipMin?: number;
  wipMax?: number;
  color: string;
}

const COLUMN_MAP: Record<string, { name: string; color: string }> = {
  new:           { name: 'To Do',       color: '#5E6C84' },
  indeterminate: { name: 'In Progress', color: '#0052CC' },
  done:          { name: 'Done',        color: '#36B37E' },
};

interface UseStatusColumnsResult {
  statusColumnMap: Record<string, StatusColumnEntry> | null;
  isLoading: boolean;
  error: unknown;
}

/**
 * Map Jira statuses to 3 columns by statusCategory:
 * new → To Do / indeterminate → In Progress / done → Done
 */
export function useStatusColumns(): UseStatusColumnsResult {
  const { data: statuses, error, isLoading } = useSWR(
    '/status',
    (url: string) => api.get<JiraStatus[]>(url).then(r => r.data),
    { revalidateOnFocus: false, dedupingInterval: 300_000 },
  );

  if (!statuses || statuses.length === 0) {
    return { statusColumnMap: null, isLoading, error };
  }

  const map: Record<string, StatusColumnEntry> = {};
  for (const s of statuses) {
    const col = COLUMN_MAP[s.statusCategory.key];
    if (col && !map[s.id]) {
      map[s.id] = { name: col.name, color: col.color };
    }
  }

  return { statusColumnMap: map, isLoading, error };
}
