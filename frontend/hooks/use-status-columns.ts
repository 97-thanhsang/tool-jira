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

// ─── Column definitions (7 workflow columns) ──────────────────────────────────

const COLUMNS: { name: string; color: string; keywords: string[] }[] = [
  { name: 'Open',        color: '#5E6C84', keywords: ['open', 'new', 'backlog'] },
  { name: 'Ready',       color: '#008DA6', keywords: ['selected', 'ready', 'todo', 'to do'] },
  { name: 'In Progress', color: '#0052CC', keywords: ['in progress', 'developing', 'active', 'working', 'doing'] },
  { name: 'In Review',   color: '#FF8B00', keywords: ['review', 'pr', 'code review', 'peer review'] },
  { name: 'Testing',     color: '#6554C0', keywords: ['test', 'qa', 'uat', 'staging', 'verification'] },
  { name: 'Done',        color: '#36B37E', keywords: ['done', 'closed', 'resolved', 'released', 'deployed', 'completed', 'cancelled'] },
  { name: 'Other',       color: '#8993A4', keywords: [] },
];

function matchColumn(statusName: string): { name: string; color: string } {
  const lower = statusName.toLowerCase();
  for (const col of COLUMNS) {
    for (const kw of col.keywords) {
      if (lower.includes(kw)) return { name: col.name, color: col.color };
    }
  }
  return { name: 'Other', color: '#8993A4' };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

interface UseStatusColumnsResult {
  statusColumnMap: Record<string, StatusColumnEntry> | null;
  isLoading: boolean;
  error: unknown;
}

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
    const col = matchColumn(s.name);
    if (!map[s.id]) {
      map[s.id] = { name: col.name, color: col.color };
    }
  }

  return { statusColumnMap: map, isLoading, error };
}
