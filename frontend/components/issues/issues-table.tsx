'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { JiraIssue, JiraTransition } from '@/types/jira';
import { StatusBadge } from '@/components/shared/status-badge';
import { PriorityIcon } from '@/components/shared/priority-icon';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/lib/api';
import {
  Loader2, X, ChevronDown, ChevronRight,
  ChevronUp, ChevronsUpDown, FolderOpen,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface IssuesTableProps {
  issues: JiraIssue[];
  total: number;
  isLoading: boolean;
  sortField: string;
  sortDir: 'ASC' | 'DESC';
  onSortChange: (field: string, dir: 'ASC' | 'DESC') => void;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function isOverdue(duedate: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(duedate) < today;
}

function IssueTypeFallback({ name }: { name: string }) {
  const colors: Record<string, string> = {
    Bug: 'bg-red-500',
    Task: 'bg-blue-500',
    Story: 'bg-green-500',
    Epic: 'bg-purple-500',
    'Sub-task': 'bg-sky-400',
  };
  const bg = colors[name] ?? 'bg-gray-400';
  return (
    <span
      className={`inline-flex items-center justify-center w-3.5 h-3.5 rounded-sm ${bg} text-white text-[8px] font-bold flex-shrink-0`}
      title={name}
    >
      {name.charAt(0).toUpperCase()}
    </span>
  );
}

function SortableHeader({
  label,
  field,
  sortField,
  sortDir,
  onSort,
  className,
}: {
  label: string;
  field: string;
  sortField: string;
  sortDir: 'ASC' | 'DESC';
  onSort: (field: string, dir: 'ASC' | 'DESC') => void;
  className?: string;
}) {
  const active = sortField === field;
  function handleClick() {
    onSort(field, active && sortDir === 'ASC' ? 'DESC' : 'ASC');
  }
  return (
    <button
      onClick={handleClick}
      className={cn(
        'flex items-center gap-0.5 text-xs font-semibold uppercase tracking-wide transition-colors flex-shrink-0',
        active
          ? 'text-[#0052CC] dark:text-blue-400'
          : 'text-[#5E6C84] dark:text-gray-400 hover:text-[#172B4D] dark:hover:text-gray-200',
        className
      )}
    >
      {label}
      {active ? (
        sortDir === 'ASC'
          ? <ChevronUp size={10} />
          : <ChevronDown size={10} />
      ) : (
        <ChevronsUpDown size={10} className="opacity-40" />
      )}
    </button>
  );
}

function IssueTableRow({
  issue,
  selected,
  onToggle,
}: {
  issue: JiraIssue;
  selected: boolean;
  onToggle: () => void;
}) {
  const f = issue.fields;
  const due = f.duedate
    ? { text: formatDate(f.duedate), overdue: isOverdue(f.duedate) }
    : null;

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-4 py-2.5 border-b border-[#DFE1E6] dark:border-gray-700 last:border-b-0 hover:bg-[#F4F5F7] dark:hover:bg-gray-700/50 transition-colors',
        selected && 'bg-[#E6F0FF] dark:bg-blue-900/20'
      )}
    >
      <input
        type="checkbox"
        checked={selected}
        onChange={onToggle}
        onClick={(e) => e.stopPropagation()}
        className="w-3.5 h-3.5 rounded border-[#DFE1E6] cursor-pointer accent-[#0052CC] flex-shrink-0"
        aria-label={`Select ${issue.key}`}
      />
      <Link
        href={`/issues/${issue.key}`}
        className="flex items-center gap-3 flex-1 min-w-0"
      >
        {/* Key */}
        <div className="flex items-center gap-1.5 w-36 flex-shrink-0 min-w-0">
          {f.issuetype.iconUrl ? (
            <Image
              src={f.issuetype.iconUrl}
              alt={f.issuetype.name}
              width={14}
              height={14}
              className="flex-shrink-0"
              unoptimized
            />
          ) : (
            <IssueTypeFallback name={f.issuetype.name} />
          )}
          <span className="text-xs text-[#0052CC] dark:text-blue-400 font-medium truncate">
            {issue.key}
          </span>
        </div>

        {/* Summary */}
        <span className="flex-1 text-sm text-[#172B4D] dark:text-gray-100 truncate min-w-0">
          {f.summary}
        </span>

        {/* Status */}
        <div className="flex-shrink-0 w-36">
          <StatusBadge status={f.status} />
        </div>

        {/* Priority */}
        <div className="flex items-center flex-shrink-0 w-16">
          <PriorityIcon priority={f.priority} />
        </div>

        {/* Assignee */}
        <div className="flex items-center gap-1.5 flex-shrink-0 w-36 min-w-0">
          {f.assignee ? (
            <>
              {f.assignee.avatarUrls['24x24'] ? (
                <Image
                  src={f.assignee.avatarUrls['24x24']}
                  alt={f.assignee.displayName}
                  width={18}
                  height={18}
                  className="rounded-full flex-shrink-0"
                  unoptimized
                />
              ) : (
                <span className="inline-flex items-center justify-center w-[18px] h-[18px] rounded-full bg-[#0052CC] text-white text-[9px] font-bold flex-shrink-0">
                  {f.assignee.displayName.charAt(0).toUpperCase()}
                </span>
              )}
              <span className="text-xs text-[#5E6C84] dark:text-gray-400 truncate">
                {f.assignee.displayName}
              </span>
            </>
          ) : (
            <span className="text-xs text-[#5E6C84] dark:text-gray-500 italic">
              Unassigned
            </span>
          )}
        </div>

        {/* Reporter */}
        <div className="flex items-center gap-1.5 flex-shrink-0 w-32 min-w-0">
          {f.reporter.avatarUrls['24x24'] ? (
            <Image
              src={f.reporter.avatarUrls['24x24']}
              alt={f.reporter.displayName}
              width={18}
              height={18}
              className="rounded-full flex-shrink-0"
              unoptimized
            />
          ) : (
            <span className="inline-flex items-center justify-center w-[18px] h-[18px] rounded-full bg-gray-400 text-white text-[9px] font-bold flex-shrink-0">
              {f.reporter.displayName.charAt(0).toUpperCase()}
            </span>
          )}
          <span className="text-xs text-[#5E6C84] dark:text-gray-400 truncate">
            {f.reporter.displayName}
          </span>
        </div>

        {/* Est */}
        <span className="text-xs text-[#5E6C84] dark:text-gray-400 flex-shrink-0 w-20 truncate">
          {f.timetracking?.originalEstimate ?? '—'}
        </span>

        {/* Due */}
        <span
          className={cn(
            'text-xs flex-shrink-0 w-24',
            due?.overdue
              ? 'text-red-500 dark:text-red-400 font-medium'
              : 'text-[#5E6C84] dark:text-gray-400'
          )}
        >
          {due?.text ?? '—'}
        </span>

        {/* Updated */}
        <span className="text-xs text-[#5E6C84] dark:text-gray-400 flex-shrink-0 w-24 text-right">
          {formatDate(f.updated)}
        </span>
      </Link>
    </div>
  );
}

export function IssuesTable({
  issues,
  total,
  isLoading,
  sortField,
  sortDir,
  onSortChange,
}: IssuesTableProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [transitioning, setTransitioning] = useState(false);
  const [transitionDropOpen, setTransitionDropOpen] = useState(false);
  const [commonTransitions, setCommonTransitions] = useState<JiraTransition[]>([]);
  const [transitionsLoading, setTransitionsLoading] = useState(false);
  const [collapsedProjects, setCollapsedProjects] = useState<Set<string>>(new Set());

  // Group issues by project
  const groups = useMemo(() => {
    const map = new Map<string, { projectName: string; issues: JiraIssue[] }>();
    for (const issue of issues) {
      const key = issue.fields.project.key;
      if (!map.has(key)) {
        map.set(key, { projectName: issue.fields.project.name, issues: [] });
      }
      map.get(key)!.issues.push(issue);
    }
    return Array.from(map.entries()).map(([projectKey, val]) => ({
      projectKey,
      projectName: val.projectName,
      issues: val.issues,
    }));
  }, [issues]);

  const allSelected = issues.length > 0 && issues.every((i) => selected.has(i.id));

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

  function toggleProject(projectKey: string) {
    setCollapsedProjects((prev) => {
      const next = new Set(prev);
      if (next.has(projectKey)) next.delete(projectKey);
      else next.add(projectKey);
      return next;
    });
  }

  const selectedCount = selected.size;
  const selectedIssues = issues.filter((i) => selected.has(i.id));

  const loadTransitions = useCallback(async () => {
    if (selectedIssues.length === 0) return;
    setTransitionsLoading(true);
    try {
      const res = await api.get<{ transitions: JiraTransition[] }>(
        `/issue/${selectedIssues[0].key}/transitions`
      );
      setCommonTransitions(res.data.transitions ?? []);
    } catch {
      setCommonTransitions([]);
    } finally {
      setTransitionsLoading(false);
    }
  }, [selectedIssues]);

  useEffect(() => {
    if (selectedCount > 0) loadTransitions();
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
        // continue
      }
    }
    setTransitioning(false);
    setSelected(new Set());
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
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-2 bg-[#F4F5F7] dark:bg-gray-700 border-b border-[#DFE1E6] dark:border-gray-600">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={toggleSelectAll}
            className="w-3.5 h-3.5 rounded border-[#DFE1E6] flex-shrink-0 cursor-pointer accent-[#0052CC]"
            aria-label="Select all"
          />
          <SortableHeader label="Key" field="key" sortField={sortField} sortDir={sortDir} onSort={onSortChange} className="w-36" />
          <SortableHeader label="Summary" field="summary" sortField={sortField} sortDir={sortDir} onSort={onSortChange} className="flex-1" />
          <SortableHeader label="Status" field="status" sortField={sortField} sortDir={sortDir} onSort={onSortChange} className="w-36" />
          <SortableHeader label="Priority" field="priority" sortField={sortField} sortDir={sortDir} onSort={onSortChange} className="w-16" />
          <SortableHeader label="Assignee" field="assignee" sortField={sortField} sortDir={sortDir} onSort={onSortChange} className="w-36" />
          <SortableHeader label="Reporter" field="reporter" sortField={sortField} sortDir={sortDir} onSort={onSortChange} className="w-32" />
          <span className="text-xs font-semibold text-[#5E6C84] dark:text-gray-400 uppercase tracking-wide w-20 flex-shrink-0">
            Est
          </span>
          <SortableHeader label="Due" field="duedate" sortField={sortField} sortDir={sortDir} onSort={onSortChange} className="w-24" />
          <SortableHeader label="Updated" field="updated" sortField={sortField} sortDir={sortDir} onSort={onSortChange} className="w-24 justify-end" />
        </div>

        {issues.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-sm text-[#5E6C84] dark:text-gray-400">
            No issues found
          </div>
        ) : (
          groups.map(({ projectKey, projectName, issues: groupIssues }) => {
            const collapsed = collapsedProjects.has(projectKey);
            return (
              <div key={projectKey}>
                {/* Project group header */}
                <button
                  onClick={() => toggleProject(projectKey)}
                  className="w-full flex items-center gap-2 px-4 py-2 bg-[#F4F5F7] dark:bg-gray-750 hover:bg-[#EBECF0] dark:hover:bg-gray-700 border-b border-[#DFE1E6] dark:border-gray-600 transition-colors"
                >
                  {collapsed
                    ? <ChevronRight size={13} className="text-[#5E6C84] flex-shrink-0" />
                    : <ChevronDown size={13} className="text-[#5E6C84] flex-shrink-0" />
                  }
                  <FolderOpen size={13} className="text-[#5E6C84] flex-shrink-0" />
                  <span className="text-xs font-semibold text-[#172B4D] dark:text-gray-100">
                    {projectName}
                  </span>
                  <span className="text-xs text-[#5E6C84] dark:text-gray-400 font-medium">
                    ({groupIssues.length})
                  </span>
                </button>

                {/* Issues in this group */}
                {!collapsed && groupIssues.map((issue) => (
                  <IssueTableRow
                    key={issue.id}
                    issue={issue}
                    selected={selected.has(issue.id)}
                    onToggle={() => toggleSelect(issue.id)}
                  />
                ))}
              </div>
            );
          })
        )}
      </div>

      {/* Issue count footer */}
      {total > 0 && (
        <div className="mt-2 px-1">
          <span className="text-xs text-[#5E6C84] dark:text-gray-400">
            {issues.length < total
              ? `Hiển thị ${issues.length} / ${total} issues`
              : `${total} issues`}
          </span>
        </div>
      )}
    </div>
  );
}
