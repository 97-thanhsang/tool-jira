'use client';

import { useState, useEffect, useRef } from 'react';
import useSWR from 'swr';
import { api } from '@/lib/api';
import type { IssueFilters } from '@/hooks/use-issues-list';
import type { JiraProject } from '@/types/jira';
import { Search, ChevronDown, ChevronUp, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FilterPanelProps {
  filters: IssueFilters;
  onUpdate: (f: Partial<IssueFilters>) => void;
  onClear: () => void;
}

const selectClass =
  'text-xs border border-[#DFE1E6] dark:border-gray-600 rounded px-2 py-1.5 bg-white dark:bg-gray-800 text-[#172B4D] dark:text-gray-100 focus:outline-none focus:border-[#0052CC] dark:focus:border-blue-400 min-w-[110px]';

const inputClass =
  'text-xs border border-[#DFE1E6] dark:border-gray-600 rounded px-2 py-1.5 bg-white dark:bg-gray-800 text-[#172B4D] dark:text-gray-100 focus:outline-none focus:border-[#0052CC] dark:focus:border-blue-400 placeholder-[#5E6C84] dark:placeholder-gray-500';

function FilterLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-xs font-medium text-[#5E6C84] dark:text-gray-400 whitespace-nowrap">
      {children}
    </span>
  );
}

const ISSUE_TYPES = ['Bug', 'Task', 'Story', 'Sub-task', 'Epic'];

const STATUS_OPTIONS = [
  { value: 'new', label: 'To Do' },
  { value: 'indeterminate', label: 'In Progress' },
  { value: 'done', label: 'Done' },
];

const PRIORITY_OPTIONS = [
  'Highest',
  'High',
  'Medium',
  'Low',
  'Lowest',
];

const UPDATED_OPTIONS = [
  { value: '-1d', label: 'Last 24h' },
  { value: '-7d', label: 'Last 7 days' },
  { value: '-30d', label: 'Last 30 days' },
];

const DUEDATE_OPTIONS = [
  { value: 'overdue', label: 'Overdue' },
  { value: 'this_week', label: 'This week' },
  { value: 'next_week', label: 'Next week' },
];

export function FilterPanel({ filters, onUpdate, onClear }: FilterPanelProps) {
  const [showMore, setShowMore] = useState(false);
  const [textInput, setTextInput] = useState(filters.text ?? '');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync text input when filters are cleared externally
  useEffect(() => {
    if (!filters.text) setTextInput('');
  }, [filters.text]);

  // Debounced text search
  function handleTextChange(value: string) {
    setTextInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onUpdate({ text: value || undefined });
    }, 400);
  }

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // Fetch projects list (cached by SWR)
  const { data: projects } = useSWR<JiraProject[]>(
    '/project?maxResults=50',
    (url: string) => api.get<JiraProject[]>(url).then((r) => r.data)
  );

  // Count advanced (row-2) active filters
  const advancedActiveCount = [
    filters.project,
    filters.assignee,
    filters.labels,
    filters.updatedAfter,
    filters.duedate,
  ].filter(Boolean).length;

  // All active filter chips
  const chips: { key: keyof IssueFilters; label: string }[] = [];
  if (filters.text) chips.push({ key: 'text', label: `Text: "${filters.text}"` });
  if (filters.status) {
    const s = STATUS_OPTIONS.find((o) => o.value === filters.status);
    chips.push({ key: 'status', label: `Status: ${s?.label ?? filters.status}` });
  }
  if (filters.priority) chips.push({ key: 'priority', label: `Priority: ${filters.priority}` });
  if (filters.issuetype) chips.push({ key: 'issuetype', label: `Type: ${filters.issuetype}` });
  if (filters.project) {
    const proj = projects?.find((p) => p.key === filters.project);
    chips.push({ key: 'project', label: `Project: ${proj?.name ?? filters.project}` });
  }
  if (filters.assignee === 'currentUser()') chips.push({ key: 'assignee', label: 'Assignee: Me' });
  else if (filters.assignee === 'EMPTY') chips.push({ key: 'assignee', label: 'Assignee: Unassigned' });
  if (filters.labels) chips.push({ key: 'labels', label: `Label: ${filters.labels}` });
  if (filters.updatedAfter) {
    const u = UPDATED_OPTIONS.find((o) => o.value === filters.updatedAfter);
    chips.push({ key: 'updatedAfter', label: `Updated: ${u?.label ?? filters.updatedAfter}` });
  }
  if (filters.duedate) {
    const d = DUEDATE_OPTIONS.find((o) => o.value === filters.duedate);
    chips.push({ key: 'duedate', label: `Due: ${d?.label ?? filters.duedate}` });
  }

  const hasAnyFilter = chips.length > 0;

  function removeChip(key: keyof IssueFilters) {
    if (key === 'text') setTextInput('');
    onUpdate({ [key]: undefined });
  }

  return (
    <div className="mb-4 rounded-sm border border-[#DFE1E6] dark:border-gray-700 bg-[#F4F5F7] dark:bg-gray-800/60 overflow-hidden">
      {/* Row 1 — always visible */}
      <div className="flex items-center gap-2 px-4 py-2.5 flex-wrap">
        {/* Text search */}
        <div className="relative flex items-center flex-1 min-w-[180px] max-w-xs">
          <Search
            size={13}
            className="absolute left-2 text-[#5E6C84] dark:text-gray-500 pointer-events-none"
          />
          <input
            type="text"
            value={textInput}
            onChange={(e) => handleTextChange(e.target.value)}
            placeholder="Search issues…"
            className={cn(inputClass, 'pl-6 w-full')}
          />
        </div>

        {/* Type */}
        <div className="flex items-center gap-1.5">
          <FilterLabel>Type</FilterLabel>
          <select
            className={selectClass}
            value={filters.issuetype ?? ''}
            onChange={(e) =>
              onUpdate({ issuetype: e.target.value || undefined })
            }
          >
            <option value="">All</option>
            {ISSUE_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        {/* Status */}
        <div className="flex items-center gap-1.5">
          <FilterLabel>Status</FilterLabel>
          <select
            className={selectClass}
            value={filters.status ?? ''}
            onChange={(e) =>
              onUpdate({ status: e.target.value || undefined })
            }
          >
            <option value="">All</option>
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        {/* Priority */}
        <div className="flex items-center gap-1.5">
          <FilterLabel>Priority</FilterLabel>
          <select
            className={selectClass}
            value={filters.priority ?? ''}
            onChange={(e) =>
              onUpdate({ priority: e.target.value || undefined })
            }
          >
            <option value="">All</option>
            {PRIORITY_OPTIONS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        {/* More filters toggle */}
        <button
          onClick={() => setShowMore((prev) => !prev)}
          className={cn(
            'flex items-center gap-1 text-xs px-2.5 py-1.5 rounded border transition-colors',
            showMore || advancedActiveCount > 0
              ? 'bg-[#0052CC] border-[#0052CC] text-white'
              : 'bg-white dark:bg-gray-700 border-[#DFE1E6] dark:border-gray-600 text-[#5E6C84] dark:text-gray-300 hover:border-[#0052CC] hover:text-[#0052CC]'
          )}
        >
          {showMore ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          More filters
          {advancedActiveCount > 0 && (
            <span
              className={cn(
                'ml-1 inline-flex items-center justify-center rounded-full text-[10px] font-bold w-4 h-4',
                showMore || advancedActiveCount > 0
                  ? 'bg-white text-[#0052CC]'
                  : 'bg-[#0052CC] text-white'
              )}
            >
              {advancedActiveCount}
            </span>
          )}
        </button>

        {hasAnyFilter && (
          <button
            onClick={onClear}
            className="text-xs text-[#0052CC] dark:text-blue-400 hover:underline ml-auto"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Row 2 — collapsible */}
      {showMore && (
        <div className="flex items-center gap-2 px-4 py-2 border-t border-[#DFE1E6] dark:border-gray-700 bg-white dark:bg-gray-800 flex-wrap">
          {/* Project */}
          <div className="flex items-center gap-1.5">
            <FilterLabel>Project</FilterLabel>
            <select
              className={selectClass}
              value={filters.project ?? ''}
              onChange={(e) =>
                onUpdate({ project: e.target.value || undefined })
              }
            >
              <option value="">All</option>
              {(projects ?? []).map((p) => (
                <option key={p.key} value={p.key}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Assignee */}
          <div className="flex items-center gap-1.5">
            <FilterLabel>Assignee</FilterLabel>
            <select
              className={selectClass}
              value={filters.assignee ?? ''}
              onChange={(e) =>
                onUpdate({ assignee: e.target.value || undefined })
              }
            >
              <option value="">All</option>
              <option value="currentUser()">Me</option>
              <option value="EMPTY">Unassigned</option>
            </select>
          </div>

          {/* Labels */}
          <div className="flex items-center gap-1.5">
            <FilterLabel>Label</FilterLabel>
            <input
              type="text"
              placeholder="e.g. frontend"
              className={cn(inputClass, 'min-w-[120px]')}
              value={filters.labels ?? ''}
              onChange={(e) =>
                onUpdate({ labels: e.target.value || undefined })
              }
            />
          </div>

          {/* Updated */}
          <div className="flex items-center gap-1.5">
            <FilterLabel>Updated</FilterLabel>
            <select
              className={selectClass}
              value={filters.updatedAfter ?? ''}
              onChange={(e) =>
                onUpdate({ updatedAfter: e.target.value || undefined })
              }
            >
              <option value="">Any time</option>
              {UPDATED_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          {/* Due date */}
          <div className="flex items-center gap-1.5">
            <FilterLabel>Due date</FilterLabel>
            <select
              className={selectClass}
              value={filters.duedate ?? ''}
              onChange={(e) =>
                onUpdate({ duedate: e.target.value || undefined })
              }
            >
              <option value="">Any</option>
              {DUEDATE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Active filter chips */}
      {chips.length > 0 && (
        <div className="flex items-center gap-1.5 px-4 py-2 border-t border-[#DFE1E6] dark:border-gray-700 flex-wrap">
          {chips.map((chip) => (
            <span
              key={chip.key}
              className="inline-flex items-center gap-1 text-xs bg-[#E6F0FF] dark:bg-blue-900/40 text-[#0052CC] dark:text-blue-300 border border-[#0052CC]/20 dark:border-blue-600/30 rounded px-2 py-0.5"
            >
              {chip.label}
              <button
                onClick={() => removeChip(chip.key)}
                className="hover:text-red-500 transition-colors ml-0.5"
                aria-label={`Remove ${chip.label} filter`}
              >
                <X size={10} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
