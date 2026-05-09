'use client';

import { useState, useEffect, useCallback } from 'react';
import type { JiraIssue, JiraTransition } from '@/types/jira';
import { IssueRow } from './issue-row';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/lib/api';
import { Loader2, X, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface IssuesTableProps {
  issues: JiraIssue[];
  total: number;
  isLoading: boolean;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

export function IssuesTable({
  issues,
  total,
  isLoading,
  page,
  pageSize,
  onPageChange,
}: IssuesTableProps) {
  // Bulk selection
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [transitioning, setTransitioning] = useState(false);
  const [transitionDropOpen, setTransitionDropOpen] = useState(false);
  const [commonTransitions, setCommonTransitions] = useState<JiraTransition[]>([]);
  const [transitionsLoading, setTransitionsLoading] = useState(false);

  // Clear selection when page changes
  useEffect(() => {
    setSelected(new Set());
  }, [page]);

  const allSelected =
    issues.length > 0 && issues.every((i) => selected.has(i.id));

  function toggleSelectAll() {
    if (allSelected) {
      setSelected((prev) => {
        const next = new Set(prev);
        issues.forEach((i) => next.delete(i.id));
        return next;
      });
    } else {
      setSelected((prev) => {
        const next = new Set(prev);
        issues.forEach((i) => next.add(i.id));
        return next;
      });
    }
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function clearSelection() {
    setSelected(new Set());
  }

  const selectedCount = selected.size;
  const selectedIssues = issues.filter((i) => selected.has(i.id));

  // Load transitions when selection changes
  const loadTransitions = useCallback(async () => {
    if (selectedIssues.length === 0) return;
    setTransitionsLoading(true);
    try {
      const issueKey = selectedIssues[0].key;
      const res = await api.get<{ transitions: JiraTransition[] }>(
        `/issue/${issueKey}/transitions`
      );
      setCommonTransitions(res.data.transitions ?? []);
    } catch {
      setCommonTransitions([]);
    } finally {
      setTransitionsLoading(false);
    }
  }, [selectedIssues]);

  useEffect(() => {
    if (selectedCount > 0) {
      loadTransitions();
    }
  }, [selectedCount, loadTransitions]);

  async function applyTransition(transition: JiraTransition) {
    if (transitioning) return;
    setTransitionDropOpen(false);
    setTransitioning(true);

    for (const issue of selectedIssues) {
      try {
        await api.post(`/issue/${issue.key}/transitions`, {
          transition: { id: transition.id },
        });
      } catch {
        // Continue with other issues even if one fails
      }
    }

    setTransitioning(false);
    setSelected(new Set());
    window.dispatchEvent(new CustomEvent('issues-bulk-transitioned'));
  }

  // Pagination
  const totalPages = Math.ceil(total / pageSize);
  const startItem = total === 0 ? 0 : page * pageSize + 1;
  const endItem = Math.min((page + 1) * pageSize, total);

  if (isLoading) {
    return (
      <div className="space-y-2 mt-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div>
      {/* Bulk Action Bar */}
      {selectedCount > 0 && (
        <div className="flex items-center gap-3 mb-3 px-4 py-2.5 bg-[#E6F0FF] dark:bg-blue-900/30 border border-[#0052CC]/30 dark:border-blue-600/30 rounded-sm">
          <span className="text-sm font-medium text-[#0052CC] dark:text-blue-300">
            {selectedCount} selected
          </span>

          <div className="relative">
            <button
              onClick={() => setTransitionDropOpen((prev) => !prev)}
              disabled={transitionsLoading || transitioning}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-white dark:bg-gray-800 border border-[#DFE1E6] dark:border-gray-600 rounded text-[#172B4D] dark:text-gray-100 hover:border-[#0052CC] transition-colors disabled:opacity-50"
            >
              {transitionsLoading || transitioning ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <ChevronDown size={12} />
              )}
              Transition to…
            </button>
            {transitionDropOpen && commonTransitions.length > 0 && (
              <div className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 border border-[#DFE1E6] dark:border-gray-700 rounded shadow-lg z-20 min-w-[160px]">
                {commonTransitions.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => applyTransition(t)}
                    className="w-full text-left text-xs px-3 py-2 text-[#172B4D] dark:text-gray-200 hover:bg-[#F4F5F7] dark:hover:bg-gray-700 transition-colors border-b border-[#DFE1E6] dark:border-gray-700 last:border-b-0"
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={clearSelection}
            className="flex items-center gap-1 text-xs text-[#5E6C84] dark:text-gray-400 hover:text-[#172B4D] dark:hover:text-gray-200 ml-auto transition-colors"
          >
            <X size={12} />
            Clear
          </button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-sm border border-[#DFE1E6] dark:border-gray-700 overflow-hidden">
        {/* Header row */}
        <div className="flex items-center gap-3 px-4 py-2 bg-[#F4F5F7] dark:bg-gray-700 border-b border-[#DFE1E6] dark:border-gray-600">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={toggleSelectAll}
            className="w-3.5 h-3.5 rounded border-[#DFE1E6] flex-shrink-0 cursor-pointer accent-[#0052CC]"
            aria-label="Select all"
          />
          <span className="text-xs font-semibold text-[#5E6C84] dark:text-gray-400 uppercase tracking-wide w-28 flex-shrink-0">
            Key
          </span>
          <span className="flex-1 text-xs font-semibold text-[#5E6C84] dark:text-gray-400 uppercase tracking-wide min-w-0">
            Summary
          </span>
          <span className="text-xs font-semibold text-[#5E6C84] dark:text-gray-400 uppercase tracking-wide w-28 flex-shrink-0">
            Status
          </span>
          <span className="text-xs font-semibold text-[#5E6C84] dark:text-gray-400 uppercase tracking-wide w-20 flex-shrink-0">
            Priority
          </span>
          <span className="text-xs font-semibold text-[#5E6C84] dark:text-gray-400 uppercase tracking-wide w-28 flex-shrink-0">
            Assignee
          </span>
          <span className="text-xs font-semibold text-[#5E6C84] dark:text-gray-400 uppercase tracking-wide w-28 flex-shrink-0">
            Project
          </span>
          <span className="text-xs font-semibold text-[#5E6C84] dark:text-gray-400 uppercase tracking-wide w-20 flex-shrink-0 text-right">
            Updated
          </span>
        </div>

        {issues.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-sm text-[#5E6C84] dark:text-gray-400">
            No issues found
          </div>
        ) : (
          issues.map((issue) => (
            <div key={issue.id} className="flex items-center">
              <div className="flex-shrink-0 pl-4 pr-1">
                <input
                  type="checkbox"
                  checked={selected.has(issue.id)}
                  onChange={() => toggleSelect(issue.id)}
                  className={cn(
                    'w-3.5 h-3.5 rounded border-[#DFE1E6] cursor-pointer accent-[#0052CC]'
                  )}
                  aria-label={`Select ${issue.key}`}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
              <div className="flex-1 min-w-0">
                <IssueRow issue={issue} />
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination footer */}
      {total > 0 && (
        <div className="flex items-center justify-between mt-3 px-1">
          <span className="text-xs text-[#5E6C84] dark:text-gray-400">
            {total === 0
              ? 'No issues'
              : `Showing ${startItem}–${endItem} of ${total} issues`}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page === 0}
              className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded border border-[#DFE1E6] dark:border-gray-600 bg-white dark:bg-gray-800 text-[#172B4D] dark:text-gray-200 hover:border-[#0052CC] hover:text-[#0052CC] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={12} />
              Prev
            </button>
            <span className="text-xs text-[#5E6C84] dark:text-gray-400 px-2">
              {page + 1} / {totalPages || 1}
            </span>
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page + 1 >= totalPages}
              className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded border border-[#DFE1E6] dark:border-gray-600 bg-white dark:bg-gray-800 text-[#172B4D] dark:text-gray-200 hover:border-[#0052CC] hover:text-[#0052CC] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next
              <ChevronRight size={12} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
