'use client';
import useSWR from 'swr';
import { api } from '@/lib/api';
import type { JiraStatus } from '@/types/jira';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StatusColumnEntry {
  name: string;
  wipMin?: number;
  wipMax?: number;
  color: string;
}

// ─── Column colors ────────────────────────────────────────────────────────────

const COLUMN_COLORS: Record<string, string> = {
  'To Do':        '#5E6C84', // gray
  'In Progress':  '#0052CC', // blue
  'In Review':    '#FF8B00', // orange
  'Testing':      '#6554C0', // purple
  'Done':         '#36B37E', // green
};

// ─── Keyword matching ─────────────────────────────────────────────────────────

type ColumnName = 'To Do' | 'In Progress' | 'In Review' | 'Testing' | 'Done';

const COLUMN_KEYWORDS: [ColumnName, string[]][] = [
  ['To Do',       ['open', 'backlog', 'todo', 'selected', 'new', 'pending', 'waiting', 'ready']],
  ['In Progress', ['in progress', 'developing', 'working', 'active', 'implementation', 'doing']],
  ['In Review',   ['review', 'pr', 'code review', 'peer review', 'verify']],
  ['Testing',     ['test', 'qa', 'uat', 'verification', 'staging', 'testing']],
  ['Done',        ['done', 'closed', 'resolved', 'released', 'deployed', 'completed', 'cancelled']],
];

/** Match a status name to a column based on keyword matching (case-insensitive). */
function matchColumn(statusName: string): ColumnName {
  const lower = statusName.toLowerCase();
  for (const [column, keywords] of COLUMN_KEYWORDS) {
    for (const kw of keywords) {
      if (lower.includes(kw)) return column;
    }
  }
  return 'To Do'; // fallback
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

interface UseStatusColumnsResult {
  /** statusId → column entry */
  statusColumnMap: Record<string, StatusColumnEntry> | null;
  isLoading: boolean;
  error: unknown;
}

/**
 * Fetch all Jira statuses and build a status-to-column mapping
 * using keyword matching into 5 common columns:
 * To Do / In Progress / In Review / Testing / Done
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

  // Build statusId → ColumnEntry map
  const map: Record<string, StatusColumnEntry> = {};
  for (const s of statuses) {
    const column = matchColumn(s.name);
    // Only set once (first match wins); subsequent matches for same column are skipped
    if (!map[s.id]) {
      map[s.id] = {
        name: column,
        color: COLUMN_COLORS[column],
      };
    }
  }

  return { statusColumnMap: map, isLoading, error };
}
