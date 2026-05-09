'use client';
import { RefreshCw } from 'lucide-react';
import { useMyIssues } from '@/hooks/use-my-issues';
import { KanbanBoard } from '@/components/board/kanban-board';
import { Button } from '@/components/ui/button';

export default function BoardPage() {
  const { grouped, total, isLoading, error, mutate } = useMyIssues();

  const columns = [
    { id: 'todo',       label: 'To Do',      issues: grouped.todo,       color: '#5E6C84' },
    { id: 'inProgress', label: 'In Progress', issues: grouped.inProgress, color: '#0052CC' },
    { id: 'done',       label: 'Done',        issues: grouped.done,       color: '#36B37E' },
  ];

  if (error) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-600 mb-2 text-sm">Failed to load issues</p>
        <Button variant="outline" size="sm" onClick={() => mutate()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-shrink-0">
        <div>
          <h1 className="text-xl font-semibold text-[#172B4D]">My Board</h1>
          {!isLoading && (
            <p className="text-sm text-[#5E6C84] mt-0.5">
              {grouped.todo.length + grouped.inProgress.length + grouped.done.length} issues assigned to you
              {total > grouped.todo.length + grouped.inProgress.length + grouped.done.length && (
                <span className="text-[#5E6C84]"> (showing {grouped.todo.length + grouped.inProgress.length + grouped.done.length} of {total})</span>
              )}
            </p>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => mutate()}
          disabled={isLoading}
          className="border-[#DFE1E6] text-[#5E6C84] hover:bg-[#F4F5F7]"
        >
          <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          <span className="ml-1.5">Refresh</span>
        </Button>
      </div>

      {/* Board — takes remaining height */}
      <div className="flex-1 min-h-0">
        <KanbanBoard columns={columns} isLoading={isLoading} />
      </div>
    </div>
  );
}
