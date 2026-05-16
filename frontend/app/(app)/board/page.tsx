'use client';
import { useState, useEffect, useMemo } from 'react';
import useSWR from 'swr';
import { api, getStoredUser } from '@/lib/api';
import { RefreshCw, CheckCircle2, XCircle } from 'lucide-react';
import { useBoardState, type ColumnMapEntry } from '@/hooks/use-board-state';
import { KanbanBoard, type BoardColumn } from '@/components/board/kanban-board';
import { BoardFilterBar, EMPTY_FILTERS, applyFilters, type BoardFilters } from '@/components/board/board-filters';
import { QuickViewPanel } from '@/components/board/quick-view-panel';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { JiraBoard, JiraBoardConfig, JiraIssue } from '@/types/jira';

// ─── Color palette ───────────────────────────────────────────────────────────

const COLUMN_COLORS = [
  '#5E6C84', '#0052CC', '#36B37E', '#DE350B',
  '#FF8B00', '#6554C0', '#008DA6', '#E774BB',
];

// ─── Page component ──────────────────────────────────────────────────────────

export default function BoardPage() {
  // Current user for "only my issues" quick filter
  const currentUser = getStoredUser() as { name?: string } | null;
  const currentUsername = currentUser?.name;

  // Board selection
  const [selectedBoardId, setSelectedBoardId] = useState<number | null>(null);

  const { data: boards } = useSWR<JiraBoard[]>(
    '/agile/board?maxResults=50&type=kanban',
    (url: string) => api.get<{ values: JiraBoard[] }>(url).then(r => r.data.values),
  );

  // Auto-select first board when boards load
  useEffect(() => {
    if (boards && boards.length > 0 && selectedBoardId === null) {
      setSelectedBoardId(boards[0].id);
    }
  }, [boards, selectedBoardId]);

  const { data: boardConfig } = useSWR<JiraBoardConfig>(
    selectedBoardId ? `/agile/board/${selectedBoardId}/configuration` : null,
    (url: string) => api.get<JiraBoardConfig>(url).then(r => r.data),
  );

  // Fetch the board's saved filter JQL (only when board selected)
  const { data: boardFilterJql } = useSWR<string>(
    boardConfig?.filter?.id ? `/filter/${boardConfig.filter.id}` : null,
    (url: string) =>
      api.get<{ jql: string }>(url).then(r => r.data.jql),
    { revalidateOnFocus: false, dedupingInterval: 60_000 },
  );

  // Build combined JQL: filter JQL + sub-query (if any)
  const customJql = useMemo<string | undefined>(() => {
    if (!boardFilterJql) return undefined;
    let jql = boardFilterJql;
    if (boardConfig?.subQuery?.query) {
      jql = `(${boardFilterJql}) AND (${boardConfig.subQuery.query})`;
    }
    // Append ordering if not already present
    if (!jql.toLowerCase().includes('order by')) {
      jql += ' ORDER BY updated DESC';
    }
    return jql;
  }, [boardFilterJql, boardConfig]);

  // Build statusId → ColumnMapEntry from board config
  const statusColumnMap = useMemo<Record<string, ColumnMapEntry> | null>(() => {
    if (!boardConfig?.columnConfig?.columns) return null;
    const map: Record<string, ColumnMapEntry> = {};
    boardConfig.columnConfig.columns.forEach((col, idx) => {
      col.statuses.forEach(s => {
        map[s.id] = {
          name: col.name,
          wipMin: col.min,
          wipMax: col.max,
          color: COLUMN_COLORS[idx % COLUMN_COLORS.length],
        };
      });
    });
    return map;
  }, [boardConfig]);

  const { grouped, dynamicColumns, isLoading, error, mutate, moveCard, toast } =
    useBoardState(statusColumnMap, customJql);

  // Filter state
  const [filters, setFilters] = useState<BoardFilters>(EMPTY_FILTERS);
  const [quickViewKey, setQuickViewKey] = useState<string | null>(null);

  // Apply client-side filters to each column
  const filteredGrouped = useMemo(() => {
    const result: Record<string, JiraIssue[]> = {};
    for (const [colName, issues] of Object.entries(grouped)) {
      result[colName] = applyFilters(issues, filters, currentUsername);
    }
    return result;
  }, [grouped, filters, currentUsername]);

  // Build dynamic BoardColumn array
  const columns: BoardColumn[] = useMemo(() => {
    if (dynamicColumns.length > 0) {
      return dynamicColumns.map(col => ({
        id: col.name.toLowerCase().replace(/\s+/g, '-'),
        label: col.name,
        issues: filteredGrouped[col.name] || [],
        color: col.color,
        wipMin: col.wipMin,
        wipMax: col.wipMax,
        statusIds: col.statusIds,
      }));
    }
    // Fallback 3 columns
    return [
      { id: 'to-do', label: 'To Do', issues: filteredGrouped['To Do'] || [], color: '#5E6C84', wipMax: 5, statusIds: [] },
      { id: 'in-progress', label: 'In Progress', issues: filteredGrouped['In Progress'] || [], color: '#0052CC', wipMax: 5, statusIds: [] },
      { id: 'done', label: 'Done', issues: filteredGrouped['Done'] || [], color: '#36B37E', statusIds: [] },
    ];
  }, [dynamicColumns, filteredGrouped]);

  if (error) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-600 dark:text-red-400 mb-2 text-sm">Failed to load issues</p>
        <Button variant="outline" size="sm" onClick={() => mutate()}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <h1 className="text-xl font-semibold text-[#172B4D] dark:text-gray-100 shrink-0">
            {boardConfig?.name || 'My Board'}
          </h1>
          {/* Board selector */}
          <select
            className="text-xs border border-[#DFE1E6] dark:border-gray-600 rounded px-2 py-1.5 bg-white dark:bg-gray-800 text-[#172B4D] dark:text-gray-100 focus:outline-none focus:border-[#0052CC] max-w-[200px] truncate shrink-0"
            value={selectedBoardId ?? ''}
            onChange={(e) => setSelectedBoardId(e.target.value ? Number(e.target.value) : null)}
          >
            {(boards ?? []).map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => mutate()}
          disabled={isLoading}
          className="border-[#DFE1E6] dark:border-gray-700 text-[#5E6C84] dark:text-gray-400 hover:bg-[#F4F5F7] dark:hover:bg-gray-800 ml-3 shrink-0"
        >
          <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          <span className="ml-1.5">Refresh</span>
        </Button>
      </div>

      {/* Filter bar */}
      {!isLoading && (
        <BoardFilterBar filters={filters} onChange={setFilters} allIssues={Object.values(grouped).flat()} />
      )}

      {/* Board */}
      <div className="flex-1 min-h-0">
        <KanbanBoard
          columns={columns}
          isLoading={isLoading}
          moveCard={moveCard}
          onCardClick={setQuickViewKey}
          onIssueUpdate={() => mutate()}
        />
      </div>

      {/* Quick View */}
      <QuickViewPanel issueKey={quickViewKey} onClose={() => setQuickViewKey(null)} />

      {/* Toast */}
      {toast && (
        <div
          className={cn(
            'fixed bottom-6 right-6 z-[60] flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium transition-all',
            toast.type === 'success'
              ? 'bg-[#36B37E] text-white'
              : 'bg-red-500 text-white',
          )}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 size={16} />
          ) : (
            <XCircle size={16} />
          )}
          {toast.message}
        </div>
      )}
    </div>
  );
}
