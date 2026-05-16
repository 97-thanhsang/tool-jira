'use client';
import { useState, useMemo } from 'react';
import { getStoredUser } from '@/lib/api';
import { RefreshCw, CheckCircle2, XCircle } from 'lucide-react';
import { useBoardState } from '@/hooks/use-board-state';
import { useStatusColumns } from '@/hooks/use-status-columns';
import { KanbanBoard, type BoardColumn } from '@/components/board/kanban-board';
import { BoardFilterBar, EMPTY_FILTERS, applyFilters, type BoardFilters } from '@/components/board/board-filters';
import { QuickViewPanel } from '@/components/board/quick-view-panel';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { JiraIssue } from '@/types/jira';

// ─── Page component ──────────────────────────────────────────────────────────

export default function BoardPage() {
  // Current user for "only my issues" quick filter
  const currentUser = getStoredUser() as { name?: string } | null;
  const currentUsername = currentUser?.name;

  // Status-based 5-column mapping from Jira statuses
  const { statusColumnMap } = useStatusColumns();

  const { grouped, dynamicColumns, isLoading, error, mutate, moveCard, toast } =
    useBoardState(statusColumnMap);

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
        <h1 className="text-xl font-semibold text-[#172B4D] dark:text-gray-100">
          My Board
        </h1>
        <Button
          variant="outline"
          size="sm"
          onClick={() => mutate()}
          disabled={isLoading}
          className="border-[#DFE1E6] dark:border-gray-700 text-[#5E6C84] dark:text-gray-400 hover:bg-[#F4F5F7] dark:hover:bg-gray-800 shrink-0"
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
