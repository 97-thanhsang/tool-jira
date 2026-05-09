'use client';
import { useState, useMemo } from 'react';
import { RefreshCw, CheckCircle2, XCircle } from 'lucide-react';
import { useBoardState } from '@/hooks/use-board-state';
import { KanbanBoard } from '@/components/board/kanban-board';
import { BoardCharts } from '@/components/board/board-charts';
import { BoardFilterBar, EMPTY_FILTERS, applyFilters, type BoardFilters } from '@/components/board/board-filters';
import { QuickViewPanel } from '@/components/board/quick-view-panel';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// WIP limits per column (null = no limit)
const WIP_LIMITS: Record<string, number | null> = {
  todo:       5,
  inProgress: 5,
  done:       null,
};

export default function BoardPage() {
  const { grouped, total, isLoading, error, mutate, moveCard, toast } =
    useBoardState();

  // ── Filter state ──────────────────────────────────────────────────────────
  const [filters, setFilters] = useState<BoardFilters>(EMPTY_FILTERS);

  // ── Quick View state ──────────────────────────────────────────────────────
  const [quickViewKey, setQuickViewKey] = useState<string | null>(null);

  // ── All issues flat (for filter options) ─────────────────────────────────
  const allIssues = useMemo(
    () => [...grouped.todo, ...grouped.inProgress, ...grouped.done],
    [grouped],
  );

  // ── Apply client-side filters ─────────────────────────────────────────────
  const filteredGrouped = useMemo(
    () => ({
      todo:       applyFilters(grouped.todo,       filters),
      inProgress: applyFilters(grouped.inProgress, filters),
      done:       applyFilters(grouped.done,        filters),
    }),
    [grouped, filters],
  );

  const totalShown =
    filteredGrouped.todo.length +
    filteredGrouped.inProgress.length +
    filteredGrouped.done.length;

  const columns = [
    {
      id:       'todo',
      label:    'To Do',
      issues:   filteredGrouped.todo,
      color:    '#5E6C84',
      wipLimit: WIP_LIMITS.todo,
    },
    {
      id:       'inProgress',
      label:    'In Progress',
      issues:   filteredGrouped.inProgress,
      color:    '#0052CC',
      wipLimit: WIP_LIMITS.inProgress,
    },
    {
      id:       'done',
      label:    'Done',
      issues:   filteredGrouped.done,
      color:    '#36B37E',
      wipLimit: WIP_LIMITS.done,
    },
  ];

  if (error) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-600 dark:text-red-400 mb-2 text-sm">Failed to load issues</p>
        <Button variant="outline" size="sm" onClick={() => mutate()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen p-6">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div>
          <h1 className="text-xl font-semibold text-[#172B4D] dark:text-gray-100">My Board</h1>
          {!isLoading && (
            <p className="text-sm text-[#5E6C84] dark:text-gray-400 mt-0.5">
              {totalShown} issues assigned to you
              {total > totalShown && (
                <span> (showing {totalShown} of {total})</span>
              )}
            </p>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => mutate()}
          disabled={isLoading}
          className="border-[#DFE1E6] dark:border-gray-700 text-[#5E6C84] dark:text-gray-400 hover:bg-[#F4F5F7] dark:hover:bg-gray-800"
        >
          <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          <span className="ml-1.5">Refresh</span>
        </Button>
      </div>

      {/* ── Stats charts (collapsible) ─────────────────────────────────────── */}
      {!isLoading && allIssues.length > 0 && (
        <BoardCharts grouped={grouped} />
      )}

      {/* ── Filter bar ────────────────────────────────────────────────────── */}
      {!isLoading && (
        <BoardFilterBar
          filters={filters}
          onChange={setFilters}
          allIssues={allIssues}
        />
      )}

      {/* ── Board — takes remaining height ─────────────────────────────────── */}
      <div className="flex-1 min-h-0">
        <KanbanBoard
          columns={columns}
          isLoading={isLoading}
          moveCard={moveCard}
          onCardClick={setQuickViewKey}
        />
      </div>

      {/* ── Quick View panel ───────────────────────────────────────────────── */}
      <QuickViewPanel
        issueKey={quickViewKey}
        onClose={() => setQuickViewKey(null)}
      />

      {/* ── Toast notification ─────────────────────────────────────────────── */}
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
