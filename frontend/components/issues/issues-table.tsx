'use client';

import { useState, useEffect, useCallback } from 'react';
import type { JiraIssue, JiraTransition } from '@/types/jira';
import { IssueRow } from './issue-row';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/lib/api';
import { Loader2, X, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

type StatusFilter = 'all' | 'new' | 'indeterminate' | 'done';
type PriorityFilter = 'all' | 'Highest' | 'High' | 'Medium' | 'Low' | 'Lowest';

interface IssuesTableProps {
  issues: JiraIssue[];
  isLoading: boolean;
}

const selectClass =
  'text-xs border border-[#DFE1E6] dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-800 text-[#172B4D] dark:text-gray-100 focus:outline-none focus:border-[#0052CC]';

export function IssuesTable({ issues, isLoading }: IssuesTableProps) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all');
  const [projectFilter, setProjectFilter] = useState<string>('all');

  // Bulk selection
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [transitioning, setTransitioning] = useState(false);
  const [transitionDropOpen, setTransitionDropOpen] = useState(false);
  const [commonTransitions, setCommonTransitions] = useState<JiraTransition[]>([]);
  const [transitionsLoading, setTransitionsLoading] = useState(false);

  // Derive unique projects from issues
  const projects = Array.from(
    new Map(
      issues.map((i) => [i.fields.project.key, i.fields.project.name])
    ).entries()
  );

  const filtered = issues.filter((issue) => {
    if (
      statusFilter !== 'all' &&
      issue.fields.status.statusCategory.key !== statusFilter
    )
      return false;
    if (
      priorityFilter !== 'all' &&
      issue.fields.priority.name !== priorityFilter
    )
      return false;
    if (
      projectFilter !== 'all' &&
      issue.fields.project.key !== projectFilter
    )
      return false;
    return true;
  });

  const allSelected =
    filtered.length > 0 && filtered.every((i) => selected.has(i.id));

  function toggleSelectAll() {
    if (allSelected) {
      setSelected((prev) => {
        const next = new Set(prev);
        filtered.forEach((i) => next.delete(i.id));
        return next;
      });
    } else {
      setSelected((prev) => {
        const next = new Set(prev);
        filtered.forEach((i) => next.add(i.id));
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
  const selectedIssues = filtered.filter((i) => selected.has(i.id));

  // Load transitions when selection changes (use first selected issue as reference)
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

    // Sequential (Jira rate limits)
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
    // Note: parent page should mutate/refresh; we just clear selection
    window.dispatchEvent(new CustomEvent('issues-bulk-transitioned'));
  }

  if (isLoading) {
    return (
      <div className="space-y-2 mt-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  const hasActiveFilter =
    statusFilter !== 'all' ||
    priorityFilter !== 'all' ||
    projectFilter !== 'all';

  return (
    <div>
      {/* Filter bar */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-1.5">
          <label className="text-xs text-[#5E6C84] dark:text-gray-400">Status:</label>
          <select
            className={selectClass}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          >
            <option value="all">All</option>
            <option value="new">To Do</option>
            <option value="indeterminate">In Progress</option>
            <option value="done">Done</option>
          </select>
        </div>

        <div className="flex items-center gap-1.5">
          <label className="text-xs text-[#5E6C84] dark:text-gray-400">Priority:</label>
          <select
            className={selectClass}
            value={priorityFilter}
            onChange={(e) =>
              setPriorityFilter(e.target.value as PriorityFilter)
            }
          >
            <option value="all">All</option>
            <option value="Highest">Highest</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
            <option value="Lowest">Lowest</option>
          </select>
        </div>

        {projects.length > 0 && (
          <div className="flex items-center gap-1.5">
            <label className="text-xs text-[#5E6C84] dark:text-gray-400">Project:</label>
            <select
              className={selectClass}
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
            >
              <option value="all">All</option>
              {projects.map(([key, name]) => (
                <option key={key} value={key}>
                  {name}
                </option>
              ))}
            </select>
          </div>
        )}

        {hasActiveFilter && (
          <button
            onClick={() => {
              setStatusFilter('all');
              setPriorityFilter('all');
              setProjectFilter('all');
            }}
            className="text-xs text-[#0052CC] hover:underline"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Bulk Action Bar — visible when items are selected */}
      {selectedCount > 0 && (
        <div className="flex items-center gap-3 mb-3 px-4 py-2.5 bg-[#E6F0FF] dark:bg-blue-900/30 border border-[#0052CC]/30 dark:border-blue-600/30 rounded-sm">
          <span className="text-sm font-medium text-[#0052CC] dark:text-blue-300">
            {selectedCount} selected
          </span>

          {/* Transition dropdown */}
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
          {/* Select-all checkbox */}
          <input
            type="checkbox"
            checked={allSelected}
            onChange={toggleSelectAll}
            className="w-3.5 h-3.5 rounded border-[#DFE1E6] flex-shrink-0 cursor-pointer accent-[#0052CC]"
            aria-label="Select all"
          />
          <span className="text-xs font-semibold text-[#5E6C84] dark:text-gray-400 uppercase tracking-wide w-28">
            Key
          </span>
          <span className="flex-1 text-xs font-semibold text-[#5E6C84] dark:text-gray-400 uppercase tracking-wide">
            Summary
          </span>
          <span className="text-xs font-semibold text-[#5E6C84] dark:text-gray-400 uppercase tracking-wide w-28">
            Status
          </span>
          <span className="text-xs font-semibold text-[#5E6C84] dark:text-gray-400 uppercase tracking-wide w-24">
            Priority
          </span>
          <span className="text-xs font-semibold text-[#5E6C84] dark:text-gray-400 uppercase tracking-wide w-28">
            Project
          </span>
          <span className="text-xs font-semibold text-[#5E6C84] dark:text-gray-400 uppercase tracking-wide w-20 text-right">
            Updated
          </span>
        </div>

        {filtered.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-sm text-[#5E6C84] dark:text-gray-400">
            No issues found
          </div>
        ) : (
          filtered.map((issue) => (
            <div key={issue.id} className="flex items-center">
              <div className="flex-shrink-0 pl-4 pr-1">
                <input
                  type="checkbox"
                  checked={selected.has(issue.id)}
                  onChange={() => toggleSelect(issue.id)}
                  className={cn(
                    'w-3.5 h-3.5 rounded border-[#DFE1E6] cursor-pointer accent-[#0052CC]',
                    selected.has(issue.id) && 'accent-[#0052CC]'
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

      {hasActiveFilter && (
        <p className="text-xs text-[#5E6C84] dark:text-gray-400 mt-2 text-right">
          Showing {filtered.length} of {issues.length} issues
        </p>
      )}
    </div>
  );
}
