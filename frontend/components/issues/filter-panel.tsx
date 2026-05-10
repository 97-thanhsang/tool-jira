'use client';

import { useState, useEffect, useRef } from 'react';
import useSWR from 'swr';
import { api } from '@/lib/api';
import type { IssueFilters } from '@/hooks/use-issues-list';
import type { JiraProject } from '@/types/jira';
import { UserSearchInput } from './user-search-input';
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

// ── Static data ──

const ISSUE_TYPES = [
  { id: '10100', name: 'Task' },
  { id: '10101', name: 'Sub-task' },
  { id: '10001', name: 'Story' },
  { id: '10000', name: 'Epic' },
  { id: '10102', name: 'Bug' },
  { id: '10203', name: 'Support' },
  { id: '10400', name: 'Enhancement' },
  { id: '10500', name: 'Improvement' },
  { id: '10501', name: 'New Feature' },
  { id: '10201', name: 'Build Release' },
  { id: '10202', name: 'Bug after release' },
  { id: '10200', name: 'WBS' },
];

const PRIORITY_OPTIONS = [
  { id: '1', name: 'Highest' },
  { id: '2', name: 'High' },
  { id: '3', name: 'Medium' },
  { id: '4', name: 'Low' },
  { id: '5', name: 'Lowest' },
  { id: '10000', name: 'Blocker' },
  { id: '10001', name: 'Minor' },
];

const STATUS_OPTIONS = [
  { value: 'new', label: 'To Do' },
  { value: 'indeterminate', label: 'In Progress' },
  { value: 'done', label: 'Done' },
];

const RESOLUTION_OPTIONS = [
  'Done',
  "Won't Do",
  'Duplicate',
  'Cannot Reproduce',
  'Declined',
  'Known Error',
  'Hardware failure',
  'Software failure',
];

const CREATED_OPTIONS = [
  { value: '-1d', label: 'Last 24h' },
  { value: '-7d', label: 'Last 7 days' },
  { value: '-30d', label: 'Last 30 days' },
  { value: '-90d', label: 'Last 90 days' },
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

// ── Sprint fetch hook ──
function useSprints() {
  const { data: boards } = useSWR<{ values: { id: number }[] }>(
    '/agile/board?maxResults=50',
    (url: string) => api.get<{ values: { id: number }[] }>(url).then((r) => r.data)
  );

  const { data: sprints } = useSWR<{ values: { id: number; name: string }[] }>(
    boards ? 'sprints' : null,
    async () => {
      if (!boards?.values?.length) return { values: [] };
      const results = await Promise.all(
        boards.values.map((b) =>
          api
            .get<{ values: { id: number; name: string }[] }>(
              `/agile/board/${b.id}/sprint?state=active,future`
            )
            .then((r) => r.data.values)
            .catch(() => [] as { id: number; name: string }[])
        )
      );
      // Deduplicate by name, sort alpha
      const seen = new Set<string>();
      const unique: { id: number; name: string }[] = [];
      results.flat().forEach((s) => {
        if (!seen.has(s.name)) {
          seen.add(s.name);
          unique.push(s);
        }
      });
      unique.sort((a, b) => a.name.localeCompare(b.name));
      return { values: unique };
    }
  );

  return sprints?.values ?? [];
}

// ── Components fetch hook (project-scoped) ──
function useComponents(projectKey: string | undefined) {
  const { data } = useSWR<{ id: string; name: string }[]>(
    projectKey ? `/project/${projectKey}/components` : null,
    (url: string) =>
      api
        .get<{ id: string; name: string }[]>(url)
        .then((r) => Array.isArray(r.data) ? r.data : [])
        .catch(() => [])
  );
  return data ?? [];
}

// ── Versions fetch hook (project-scoped) ──
function useVersions(projectKey: string | undefined) {
  const { data } = useSWR<{ id: string; name: string }[]>(
    projectKey ? `/project/${projectKey}/versions` : null,
    (url: string) =>
      api
        .get<{ id: string; name: string }[]>(url)
        .then((r) => Array.isArray(r.data) ? r.data : [])
        .catch(() => [])
  );
  return data ?? [];
}

// ── Main component ──

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

  // Dynamic data
  const sprints = useSprints();
  const components = useComponents(filters.project);
  const fixVersions = useVersions(filters.project);

  // Count advanced (row-2) active filters
  const advancedActiveCount = [
    filters.assignee,
    filters.reporter,
    filters.project,
    filters.sprint,
    filters.resolution,
    filters.createdAfter,
    filters.labels,
    filters.updatedAfter,
    filters.duedate,
    filters.component,
    filters.fixVersion,
  ].filter(Boolean).length;

  // All active filter chips
  const chips: { key: string; label: string }[] = [];
  if (filters.text) chips.push({ key: 'text', label: `Text: "${filters.text}"` });
  if (filters.status) {
    const s = STATUS_OPTIONS.find((o) => o.value === filters.status);
    chips.push({ key: 'status', label: `Status: ${s?.label ?? filters.status}` });
  }
  if (filters.priority) {
    const p = PRIORITY_OPTIONS.find((o) => o.name === filters.priority);
    chips.push({ key: 'priority', label: `Priority: ${p?.name ?? filters.priority}` });
  }
  if (filters.issuetype) {
    const t = ISSUE_TYPES.find((o) => o.name === filters.issuetype);
    chips.push({ key: 'issuetype', label: `Type: ${t?.name ?? filters.issuetype}` });
  }
  if (filters.project) {
    const proj = projects?.find((p) => p.key === filters.project);
    chips.push({ key: 'project', label: `Project: ${proj?.name ?? filters.project}` });
  }
  if (filters.assignee === 'currentUser()') chips.push({ key: 'assignee', label: 'Assignee: Me' });
  else if (filters.assignee === 'EMPTY') chips.push({ key: 'assignee', label: 'Assignee: Unassigned' });
  else if (filters.assignee) chips.push({ key: 'assignee', label: `Assignee: ${filters.assignee}` });
  if (filters.reporter === 'currentUser()') chips.push({ key: 'reporter', label: 'Reporter: Me' });
  else if (filters.reporter) chips.push({ key: 'reporter', label: `Reporter: ${filters.reporter}` });
  if (filters.sprint) chips.push({ key: 'sprint', label: `Sprint: ${filters.sprint}` });
  if (filters.resolution === 'all') chips.push({ key: 'resolution', label: 'Resolution: All' });
  else if (filters.resolution) chips.push({ key: 'resolution', label: `Resolution: ${filters.resolution}` });
  if (filters.createdAfter) {
    const c = CREATED_OPTIONS.find((o) => o.value === filters.createdAfter);
    chips.push({ key: 'createdAfter', label: `Created: ${c?.label ?? filters.createdAfter}` });
  }
  if (filters.labels) chips.push({ key: 'labels', label: `Label: ${filters.labels}` });
  if (filters.updatedAfter) {
    const u = UPDATED_OPTIONS.find((o) => o.value === filters.updatedAfter);
    chips.push({ key: 'updatedAfter', label: `Updated: ${u?.label ?? filters.updatedAfter}` });
  }
  if (filters.duedate) {
    const d = DUEDATE_OPTIONS.find((o) => o.value === filters.duedate);
    chips.push({ key: 'duedate', label: `Due: ${d?.label ?? filters.duedate}` });
  }
  if (filters.component) chips.push({ key: 'component', label: `Component: ${filters.component}` });
  if (filters.fixVersion) chips.push({ key: 'fixVersion', label: `Fix version: ${filters.fixVersion}` });

  const hasAnyFilter = chips.length > 0;

  function removeChip(key: string) {
    if (key === 'text') setTextInput('');
    // Cast is safe — all chip keys are IssueFilters keys
    onUpdate({ [key]: undefined } as Partial<IssueFilters>);
  }

  return (
    <div className="mb-4 rounded-sm border border-[#DFE1E6] dark:border-gray-700 bg-[#F4F5F7] dark:bg-gray-800/60 relative z-10">
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
              <option key={t.id} value={t.name}>
                {t.name}
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
              <option key={p.id} value={p.name}>
                {p.name}
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

      {/* Row 2 — collapsible More filters */}
      {showMore && (
        <div className="flex items-center gap-2 px-4 py-2 border-t border-[#DFE1E6] dark:border-gray-700 bg-white dark:bg-gray-800 flex-wrap">
          {/* Assignee — typeahead with unassigned option */}
          <div className="flex items-center gap-1.5">
            <FilterLabel>Assignee</FilterLabel>
            <UserSearchInput
              value={filters.assignee}
              onChange={(username) => onUpdate({ assignee: username })}
              placeholder="Assignee..."
              includeUnassigned
              label="Assignee"
            />
          </div>

          {/* Reporter — typeahead (no unassigned) */}
          <UserSearchInput
            value={filters.reporter}
            onChange={(username) => onUpdate({ reporter: username })}
            placeholder="Reporter..."
            label="Reporter"
          />

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

          {/* Sprint — fetched from agile API */}
          <div className="flex items-center gap-1.5">
            <FilterLabel>Sprint</FilterLabel>
            <select
              className={selectClass}
              value={filters.sprint ?? ''}
              onChange={(e) =>
                onUpdate({ sprint: e.target.value || undefined })
              }
            >
              <option value="">All</option>
              {sprints.map((s) => (
                <option key={s.id} value={s.name}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Resolution */}
          <div className="flex items-center gap-1.5">
            <FilterLabel>Resolution</FilterLabel>
            <select
              className={selectClass}
              value={filters.resolution === 'all' ? 'all' : (filters.resolution ?? '')}
              onChange={(e) => {
                const val = e.target.value;
                if (val === '') {
                  onUpdate({ resolution: undefined });
                } else if (val === 'all') {
                  onUpdate({ resolution: 'all' });
                } else {
                  onUpdate({ resolution: val });
                }
              }}
            >
              <option value="">Unresolved</option>
              <option value="all">All (including resolved)</option>
              {RESOLUTION_OPTIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          {/* Created date */}
          <div className="flex items-center gap-1.5">
            <FilterLabel>Created</FilterLabel>
            <select
              className={selectClass}
              value={filters.createdAfter ?? ''}
              onChange={(e) =>
                onUpdate({ createdAfter: e.target.value || undefined })
              }
            >
              <option value="">Any time</option>
              {CREATED_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
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

          {/* Components — only when project selected */}
          <div className="flex items-center gap-1.5">
            <FilterLabel>Component</FilterLabel>
            <select
              className={cn(selectClass, !filters.project && 'opacity-50 cursor-not-allowed')}
              value={filters.component ?? ''}
              disabled={!filters.project || components.length === 0}
              onChange={(e) =>
                onUpdate({ component: e.target.value || undefined })
              }
            >
              <option value="">All</option>
              {components.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Fix Version — only when project selected */}
          <div className="flex items-center gap-1.5">
            <FilterLabel>Fix version</FilterLabel>
            <select
              className={cn(selectClass, !filters.project && 'opacity-50 cursor-not-allowed')}
              value={filters.fixVersion ?? ''}
              disabled={!filters.project || fixVersions.length === 0}
              onChange={(e) =>
                onUpdate({ fixVersion: e.target.value || undefined })
              }
            >
              <option value="">All</option>
              {fixVersions.map((v) => (
                <option key={v.id} value={v.name}>
                  {v.name}
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
