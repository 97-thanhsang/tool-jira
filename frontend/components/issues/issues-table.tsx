'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Image from 'next/image';
import type { JiraIssue, JiraTransition, JiraSprint } from '@/types/jira';
import { StatusBadge } from '@/components/shared/status-badge';
import { PriorityIcon } from '@/components/shared/priority-icon';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/lib/api';
import { IssueDetailPanel } from './issue-detail-panel';
import {
  Loader2, X, ChevronDown, ChevronRight,
  ChevronUp, ChevronsUpDown, FolderOpen,
  Columns, Download, Check, User, Calendar,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Column config ────────────────────────────────────────────────

export type ColumnKey =
  | 'key' | 'summary' | 'type' | 'status' | 'priority'
  | 'assignee' | 'reporter' | 'sprint' | 'est' | 'logged'
  | 'labels' | 'due' | 'updated';

export type GroupBy = 'none' | 'project' | 'status' | 'sprint' | 'assignee' | 'priority';

interface ColumnDef {
  key: ColumnKey;
  label: string;
  /** Tailwind width class — must be a complete static string for JIT */
  widthClass: string;
  sortField?: string;
  defaultVisible: boolean;
  align?: 'right';
}

const COLUMNS: ColumnDef[] = [
  { key: 'key',      label: 'Key',      widthClass: 'w-36',  sortField: 'key',      defaultVisible: true  },
  { key: 'summary',  label: 'Summary',  widthClass: 'flex-1',sortField: 'summary',  defaultVisible: true  },
  { key: 'type',     label: 'Type',     widthClass: 'w-28',                          defaultVisible: true  },
  { key: 'status',   label: 'Status',   widthClass: 'w-36',  sortField: 'status',   defaultVisible: true  },
  { key: 'priority', label: 'Priority', widthClass: 'w-16',  sortField: 'priority', defaultVisible: true  },
  { key: 'assignee', label: 'Assignee', widthClass: 'w-36',  sortField: 'assignee', defaultVisible: true  },
  { key: 'reporter', label: 'Reporter', widthClass: 'w-32',  sortField: 'reporter', defaultVisible: true  },
  { key: 'sprint',   label: 'Sprint',   widthClass: 'w-32',                          defaultVisible: true  },
  { key: 'est',      label: 'Est',      widthClass: 'w-20',                          defaultVisible: true  },
  { key: 'logged',   label: 'Logged',   widthClass: 'w-20',                          defaultVisible: false },
  { key: 'labels',   label: 'Labels',   widthClass: 'w-40',                          defaultVisible: false },
  { key: 'due',      label: 'Due',      widthClass: 'w-24',  sortField: 'duedate',  defaultVisible: true  },
  { key: 'updated',  label: 'Updated',  widthClass: 'w-24',  sortField: 'updated',  defaultVisible: true, align: 'right' },
];

const DEFAULT_VISIBLE = new Set<ColumnKey>(
  COLUMNS.filter(c => c.defaultVisible).map(c => c.key)
);

// Columns that support inline edit in the grid
const INLINE_EDITABLE: ColumnKey[] = ['status', 'priority', 'due'];

const PRIORITY_NAMES = ['Highest', 'High', 'Medium', 'Low', 'Lowest', 'Blocker', 'Minor'];

const GROUP_BY_LABELS: Record<GroupBy, string> = {
  none: 'None', project: 'Project', status: 'Status',
  sprint: 'Sprint', assignee: 'Assignee', priority: 'Priority',
};

// ─── Helpers ─────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

function isOverdue(duedate: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(duedate) < today;
}

function resolveSprint(raw: unknown): JiraSprint | null {
  if (!raw) return null;
  if (Array.isArray(raw)) {
    return (raw as JiraSprint[]).find(s => s.state === 'active')
      ?? raw[raw.length - 1]
      ?? null;
  }
  return raw as JiraSprint;
}

function getCellText(key: ColumnKey, issue: JiraIssue): string {
  const f = issue.fields;
  switch (key) {
    case 'key':      return issue.key;
    case 'summary':  return f.summary;
    case 'type':     return f.issuetype.name;
    case 'status':   return f.status.name;
    case 'priority': return f.priority?.name ?? '';
    case 'assignee': return f.assignee?.displayName ?? 'Unassigned';
    case 'reporter': return f.reporter?.displayName ?? '';
    case 'sprint':   return resolveSprint(f.sprint)?.name ?? '';
    case 'est':      return f.timetracking?.originalEstimate ?? '';
    case 'logged':   return f.timetracking?.timeSpent ?? '';
    case 'labels':   return (f.labels ?? []).join(', ');
    case 'due':      return f.duedate ?? '';
    case 'updated':  return formatDate(f.updated);
    default:         return '';
  }
}

function groupIssues(issues: JiraIssue[], groupBy: GroupBy) {
  if (groupBy === 'none') return [{ key: '__all', label: '', issues }];
  const map = new Map<string, { label: string; issues: JiraIssue[] }>();

  for (const issue of issues) {
    const f = issue.fields;
    let gKey: string, gLabel: string;

    switch (groupBy) {
      case 'project':
        gKey = f.project.key; gLabel = f.project.name; break;
      case 'status': {
        const cat = f.status.statusCategory.key;
        const names: Record<string, string> = { new: 'To Do', indeterminate: 'In Progress', done: 'Done' };
        gKey = cat; gLabel = names[cat] ?? f.status.name; break;
      }
      case 'sprint': {
        const s = resolveSprint(f.sprint);
        gKey = s ? String(s.id) : '__nosprint';
        gLabel = s?.name ?? 'No Sprint'; break;
      }
      case 'assignee':
        gKey = f.assignee?.name ?? '__unassigned';
        gLabel = f.assignee?.displayName ?? 'Unassigned'; break;
      case 'priority':
        gKey = f.priority?.name ?? 'None';
        gLabel = f.priority?.name ?? 'None'; break;
      default:
        gKey = '__all'; gLabel = '';
    }

    if (!map.has(gKey)) map.set(gKey, { label: gLabel, issues: [] });
    map.get(gKey)!.issues.push(issue);
  }

  return Array.from(map.entries()).map(([key, val]) => ({ key, label: val.label, issues: val.issues }));
}

// ─── Sub-components ───────────────────────────────────────────────

function IssueTypeFallback({ name }: { name: string }) {
  const colors: Record<string, string> = {
    Bug: 'bg-red-500', Task: 'bg-blue-500', Story: 'bg-green-500',
    Epic: 'bg-purple-500', 'Sub-task': 'bg-sky-400',
  };
  return (
    <span
      className={`inline-flex items-center justify-center w-3.5 h-3.5 rounded-sm ${colors[name] ?? 'bg-gray-400'} text-white text-[8px] font-bold flex-shrink-0`}
      title={name}
    >
      {name.charAt(0)}
    </span>
  );
}

function UserAvatar({ user }: { user: { displayName: string; avatarUrls: { '24x24': string } } }) {
  return user.avatarUrls['24x24']
    ? <Image src={user.avatarUrls['24x24']} alt={user.displayName} width={18} height={18} className="rounded-full flex-shrink-0" unoptimized />
    : <span className="inline-flex items-center justify-center w-[18px] h-[18px] rounded-full bg-[#0052CC] text-white text-[9px] font-bold flex-shrink-0">{user.displayName.charAt(0)}</span>;
}

function SortableHeader({ label, field, sortField, sortDir, onSort, className }: {
  label: string; field: string; sortField: string; sortDir: 'ASC' | 'DESC';
  onSort: (f: string, d: 'ASC' | 'DESC') => void; className?: string;
}) {
  const active = sortField === field;
  return (
    <button
      onClick={() => onSort(field, active && sortDir === 'ASC' ? 'DESC' : 'ASC')}
      className={cn(
        // NOTE: no hardcoded flex-shrink-0 here — callers pass it via className for fixed columns
        'flex items-center gap-0.5 text-xs font-semibold uppercase tracking-wide transition-colors',
        active ? 'text-[#0052CC] dark:text-blue-400' : 'text-[#5E6C84] dark:text-gray-400 hover:text-[#172B4D] dark:hover:text-gray-200',
        className,
      )}
    >
      {label}
      <span className="flex-shrink-0">
        {active
          ? sortDir === 'ASC' ? <ChevronUp size={10} /> : <ChevronDown size={10} />
          : <ChevronsUpDown size={10} className="opacity-40" />}
      </span>
    </button>
  );
}

function CellContent({ col, issue }: { col: ColumnDef; issue: JiraIssue }) {
  const f = issue.fields;

  switch (col.key) {
    case 'key':
      return (
        <a
          href={`/issues/${issue.key}`}
          data-no-panel
          onClick={e => e.stopPropagation()}
          className="flex items-center gap-1.5 hover:underline"
        >
          {f.issuetype.iconUrl
            ? <Image src={f.issuetype.iconUrl} alt={f.issuetype.name} width={14} height={14} className="flex-shrink-0" unoptimized />
            : <IssueTypeFallback name={f.issuetype.name} />}
          <span className="text-xs text-[#0052CC] dark:text-blue-400 font-medium truncate">{issue.key}</span>
        </a>
      );

    case 'summary':
      return <span className="text-sm text-[#172B4D] dark:text-gray-100 truncate">{f.summary}</span>;

    case 'type':
      return (
        <div className="flex items-center gap-1.5">
          {f.issuetype.iconUrl
            ? <Image src={f.issuetype.iconUrl} alt={f.issuetype.name} width={14} height={14} className="flex-shrink-0" unoptimized />
            : <IssueTypeFallback name={f.issuetype.name} />}
          <span className="text-xs text-[#5E6C84] dark:text-gray-400 truncate">{f.issuetype.name}</span>
        </div>
      );

    case 'status':
      return <StatusBadge status={f.status} />;

    case 'priority':
      return <PriorityIcon priority={f.priority} />;

    case 'assignee':
      return f.assignee ? (
        <div className="flex items-center gap-1.5 min-w-0">
          <UserAvatar user={f.assignee} />
          <span className="text-xs text-[#5E6C84] dark:text-gray-400 truncate">{f.assignee.displayName}</span>
        </div>
      ) : <span className="text-xs text-[#5E6C84] dark:text-gray-500 italic">Unassigned</span>;

    case 'reporter':
      return (
        <div className="flex items-center gap-1.5 min-w-0">
          <UserAvatar user={f.reporter} />
          <span className="text-xs text-[#5E6C84] dark:text-gray-400 truncate">{f.reporter.displayName}</span>
        </div>
      );

    case 'sprint': {
      const s = resolveSprint(f.sprint);
      return (
        <span className="text-xs text-[#5E6C84] dark:text-gray-400 truncate">
          {s ? s.name : '—'}
        </span>
      );
    }

    case 'est':
      return <span className="text-xs text-[#5E6C84] dark:text-gray-400">{f.timetracking?.originalEstimate ?? '—'}</span>;

    case 'logged':
      return <span className="text-xs text-[#5E6C84] dark:text-gray-400">{f.timetracking?.timeSpent ?? '—'}</span>;

    case 'labels':
      return (f.labels?.length ?? 0) > 0 ? (
        <div className="flex flex-wrap gap-1">
          {f.labels.slice(0, 2).map(l => (
            <span key={l} className="text-[10px] px-1.5 py-0.5 bg-[#DFE1E6] dark:bg-gray-600 text-[#42526E] dark:text-gray-300 rounded whitespace-nowrap">
              {l}
            </span>
          ))}
          {f.labels.length > 2 && (
            <span className="text-[10px] text-[#5E6C84]">+{f.labels.length - 2}</span>
          )}
        </div>
      ) : <span className="text-xs text-[#5E6C84] dark:text-gray-500">—</span>;

    case 'due': {
      if (!f.duedate) return <span className="text-xs text-[#5E6C84] dark:text-gray-400">—</span>;
      const over = isOverdue(f.duedate);
      return (
        <span className={cn('text-xs', over ? 'text-red-500 dark:text-red-400 font-medium' : 'text-[#5E6C84] dark:text-gray-400')}>
          {formatDate(f.duedate)}
        </span>
      );
    }

    case 'updated':
      return <span className="text-xs text-[#5E6C84] dark:text-gray-400">{formatDate(f.updated)}</span>;

    default:
      return null;
  }
}

// ── Inline edit cells ─────────────────────────────────────────────

function InlineStatusEdit({ issue, onDone, onCancel }: {
  issue: JiraIssue; onDone: () => void; onCancel: () => void;
}) {
  const [transitions, setTransitions] = useState<JiraTransition[]>([]);
  const [loading, setLoading]         = useState(true);
  const [applying, setApplying]       = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.get<{ transitions: JiraTransition[] }>(`/issue/${issue.key}/transitions`)
      .then(r => setTransitions(r.data.transitions ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [issue.key]);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onCancel();
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onCancel]);

  async function apply(t: JiraTransition) {
    setApplying(t.id);
    try { await api.post(`/issue/${issue.key}/transitions`, { transition: { id: t.id } }); onDone(); }
    catch { setApplying(null); }
  }

  return (
    <div ref={ref} className="absolute left-0 top-full mt-0.5 bg-white dark:bg-gray-800 border border-[#DFE1E6] dark:border-gray-600 rounded shadow-lg z-30 min-w-[160px] py-1" onClick={e => e.stopPropagation()}>
      {loading ? (
        <div className="flex items-center gap-2 px-3 py-2 text-xs text-[#5E6C84]"><Loader2 size={12} className="animate-spin" /> Loading…</div>
      ) : transitions.map(t => (
        <button
          key={t.id}
          onClick={() => apply(t)}
          disabled={applying !== null}
          className="w-full flex items-center gap-2 text-left text-xs px-3 py-2 hover:bg-[#F4F5F7] dark:hover:bg-gray-700 disabled:opacity-50 transition-colors"
        >
          {applying === t.id ? <Loader2 size={12} className="animate-spin" /> : <ChevronDown size={11} className="text-[#5E6C84]" />}
          {t.name}
        </button>
      ))}
    </div>
  );
}

function InlinePriorityEdit({ issue, onDone, onCancel }: {
  issue: JiraIssue; onDone: () => void; onCancel: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onCancel();
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onCancel]);

  async function save(name: string) {
    setSaving(true);
    try { await api.put(`/issue/${issue.key}`, { fields: { priority: { name } } }); onDone(); }
    catch { setSaving(false); }
  }

  return (
    <div ref={ref} className="absolute left-0 top-full mt-0.5 bg-white dark:bg-gray-800 border border-[#DFE1E6] dark:border-gray-600 rounded shadow-lg z-30 min-w-[130px] py-1" onClick={e => e.stopPropagation()}>
      {PRIORITY_NAMES.map(p => (
        <button
          key={p}
          onClick={() => save(p)}
          disabled={saving}
          className={cn(
            'w-full text-left text-xs px-3 py-2 hover:bg-[#F4F5F7] dark:hover:bg-gray-700 transition-colors disabled:opacity-50',
            issue.fields.priority?.name === p && 'font-semibold text-[#0052CC]',
          )}
        >
          {p}
        </button>
      ))}
    </div>
  );
}

function InlineDueDateEdit({ issue, onDone, onCancel }: {
  issue: JiraIssue; onDone: () => void; onCancel: () => void;
}) {
  const [draft, setDraft] = useState(issue.fields.duedate ?? '');
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try { await api.put(`/issue/${issue.key}`, { fields: { duedate: draft || null } }); onDone(); }
    catch { setSaving(false); }
  }

  return (
    <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
      <input
        autoFocus
        type="date"
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') onCancel(); }}
        disabled={saving}
        className="text-xs border border-[#0052CC] rounded px-1.5 py-1 bg-white dark:bg-gray-800 text-[#172B4D] dark:text-gray-100 focus:outline-none w-28"
      />
      <button onMouseDown={save} disabled={saving} className="p-1 rounded bg-[#0052CC] text-white hover:bg-[#0747A6] disabled:opacity-50">
        {saving ? <Loader2 size={10} className="animate-spin" /> : <Check size={10} />}
      </button>
      <button onMouseDown={onCancel} className="p-1 rounded border border-[#DFE1E6] text-[#5E6C84] hover:text-red-500">
        <X size={10} />
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────

function IssueTableRow({ issue, selected, onToggle, visibleCols, onOpenPanel, onInlineSaved }: {
  issue: JiraIssue; selected: boolean; onToggle: () => void;
  visibleCols: ColumnDef[];
  onOpenPanel: (key: string) => void;
  onInlineSaved: () => void;
}) {
  const [inlineEdit, setInlineEdit] = useState<ColumnKey | null>(null);

  function handleCellClick(e: React.MouseEvent, col: ColumnDef) {
    if (!INLINE_EDITABLE.includes(col.key)) return;
    e.preventDefault();
    e.stopPropagation();
    setInlineEdit(col.key);
  }

  function handleInlineDone() { setInlineEdit(null); onInlineSaved(); }
  function handleInlineCancel() { setInlineEdit(null); }

  function handleRowClick(e: React.MouseEvent) {
    // Don't open panel when clicking checkbox or when an inline edit is open
    if (inlineEdit) return;
    if ((e.target as Element).closest('[data-no-panel]')) return;
    onOpenPanel(issue.key);
  }

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-4 py-2.5 border-b border-[#DFE1E6] dark:border-gray-700 last:border-b-0 hover:bg-[#F4F5F7] dark:hover:bg-gray-700/50 transition-colors cursor-pointer min-w-0',
        selected && 'bg-[#E6F0FF] dark:bg-blue-900/20',
      )}
      onClick={handleRowClick}
    >
      {/* Checkbox */}
      <input
        type="checkbox"
        checked={selected}
        onChange={onToggle}
        onClick={e => e.stopPropagation()}
        data-no-panel
        className="w-3.5 h-3.5 rounded border-[#DFE1E6] cursor-pointer accent-[#0052CC] flex-shrink-0"
        aria-label={`Select ${issue.key}`}
      />

      {/* Cells */}
      {visibleCols.map(col => {
        const isEditable = INLINE_EDITABLE.includes(col.key);
        const isEditing  = inlineEdit === col.key;
        return (
          <div
            key={col.key}
            className={cn(
              col.widthClass,
              // summary must NOT have flex-shrink-0 so it can give space to fixed columns
              col.key !== 'summary' && 'flex-shrink-0',
              // summary needs min-w-0 so it can shrink in flex and truncate works
              col.key === 'summary' && 'min-w-0 overflow-hidden',
              col.align === 'right' && 'text-right',
              isEditable && !isEditing && 'group/cell relative cursor-pointer',
              isEditing && 'relative',
            )}
            onClick={isEditable ? e => handleCellClick(e, col) : undefined}
            data-no-panel={isEditable ? '' : undefined}
          >
            {isEditing ? (
              <>
                {col.key === 'status'   && <InlineStatusEdit   issue={issue} onDone={handleInlineDone} onCancel={handleInlineCancel} />}
                {col.key === 'priority' && <InlinePriorityEdit issue={issue} onDone={handleInlineDone} onCancel={handleInlineCancel} />}
                {col.key === 'due'      && <InlineDueDateEdit  issue={issue} onDone={handleInlineDone} onCancel={handleInlineCancel} />}
              </>
            ) : (
              <div className={cn(
                'flex items-center min-w-0',
                isEditable && 'group-hover/cell:opacity-80 transition-opacity',
              )}>
                <CellContent col={col} issue={issue} />
                {isEditable && col.key !== 'status' && (
                  <span className="ml-1 flex-shrink-0 opacity-0 group-hover/cell:opacity-60 transition-opacity">
                    <ChevronDown size={9} className="text-[#5E6C84]" />
                  </span>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────

interface IssuesTableProps {
  issues: JiraIssue[];
  total: number;
  isLoading: boolean;
  sortField: string;
  sortDir: 'ASC' | 'DESC';
  onSortChange: (field: string, dir: 'ASC' | 'DESC') => void;
}

export function IssuesTable({ issues, total, isLoading, sortField, sortDir, onSortChange }: IssuesTableProps) {
  const [selected, setSelected]                 = useState<Set<string>>(new Set());
  const [transitioning, setTransitioning]       = useState(false);
  const [transitionDropOpen, setTransDropOpen]  = useState(false);
  const [commonTransitions, setCommonTrans]     = useState<JiraTransition[]>([]);
  const [transitionsLoading, setTransLoading]   = useState(false);
  const [collapsedGroups, setCollapsedGroups]   = useState<Set<string>>(new Set());
  const [visibleColumns, setVisibleColumns]     = useState<Set<ColumnKey>>(DEFAULT_VISIBLE);
  const [groupBy, setGroupBy]                   = useState<GroupBy>('project');
  const [showColumnPicker, setShowColPicker]    = useState(false);
  // Panel
  const [panelKey, setPanelKey]                 = useState<string | null>(null);
  // Bulk extras
  const [bulkAssignOpen, setBulkAssignOpen]     = useState(false);
  const [bulkPriorityOpen, setBulkPriorityOpen] = useState(false);
  const [bulkDueOpen, setBulkDueOpen]           = useState(false);
  const [bulkAssignQuery, setBulkAssignQuery]   = useState('');
  const [bulkPriority, setBulkPriority]         = useState('');
  const [bulkDue, setBulkDue]                   = useState('');
  const [bulkApplying, setBulkApplying]         = useState(false);
  const bulkAssignRef  = useRef<HTMLDivElement>(null);
  const bulkPriorityRef = useRef<HTMLDivElement>(null);
  const bulkDueRef     = useRef<HTMLDivElement>(null);

  const colPickerRef = useRef<HTMLDivElement>(null);

  // Close column picker on outside click
  useEffect(() => {
    if (!showColumnPicker) return;
    function onMouseDown(e: MouseEvent) {
      if (colPickerRef.current && !colPickerRef.current.contains(e.target as Node)) {
        setShowColPicker(false);
      }
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [showColumnPicker]);

  // Close bulk dropdowns on outside click
  useEffect(() => {
    if (!bulkAssignOpen && !bulkPriorityOpen && !bulkDueOpen) return;
    function handler(e: MouseEvent) {
      if (bulkAssignOpen   && bulkAssignRef.current   && !bulkAssignRef.current.contains(e.target as Node))   setBulkAssignOpen(false);
      if (bulkPriorityOpen && bulkPriorityRef.current && !bulkPriorityRef.current.contains(e.target as Node)) setBulkPriorityOpen(false);
      if (bulkDueOpen      && bulkDueRef.current      && !bulkDueRef.current.contains(e.target as Node))      setBulkDueOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [bulkAssignOpen, bulkPriorityOpen, bulkDueOpen]);

  // Bulk apply fields
  async function applyBulkField(fields: Record<string, unknown>) {
    setBulkApplying(true);
    for (const issue of selectedIssues) {
      try { await api.put(`/issue/${issue.key}`, { fields }); }
      catch { /* continue */ }
    }
    setBulkApplying(false);
    setBulkAssignOpen(false); setBulkPriorityOpen(false); setBulkDueOpen(false);
    setBulkAssignQuery(''); setBulkPriority(''); setBulkDue('');
    setSelected(new Set());
    window.dispatchEvent(new CustomEvent('issues-bulk-transitioned'));
  }

  const visibleCols = useMemo(
    () => COLUMNS.filter(c => visibleColumns.has(c.key)),
    [visibleColumns],
  );

  const groups = useMemo(() => groupIssues(issues, groupBy), [issues, groupBy]);

  const allSelected = issues.length > 0 && issues.every(i => selected.has(i.id));

  function toggleSelectAll() {
    setSelected(prev => {
      const next = new Set(prev);
      if (allSelected) issues.forEach(i => next.delete(i.id));
      else issues.forEach(i => next.add(i.id));
      return next;
    });
  }

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleGroup(key: string) {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  function toggleColumn(key: ColumnKey) {
    setVisibleColumns(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  const selectedCount  = selected.size;
  // useMemo so selectedIssues reference is stable → doesn't re-trigger effects every render
  const selectedIssues = useMemo(
    () => issues.filter(i => selected.has(i.id)),
    [issues, selected],
  );
  // Stable primitive for the dependency array
  const firstSelectedKey = selectedIssues[0]?.key ?? null;

  const loadTransitions = useCallback(async () => {
    if (!firstSelectedKey) return;
    setTransLoading(true);
    setCommonTrans([]);
    try {
      const res = await api.get<{ transitions: JiraTransition[] }>(`/issue/${firstSelectedKey}/transitions`);
      setCommonTrans(res.data.transitions ?? []);
    } catch { setCommonTrans([]); }
    finally { setTransLoading(false); }
  }, [firstSelectedKey]);

  useEffect(() => {
    if (firstSelectedKey) loadTransitions();
    else { setCommonTrans([]); setTransLoading(false); }
  }, [firstSelectedKey, loadTransitions]);

  async function applyTransition(t: JiraTransition) {
    if (transitioning) return;
    setTransDropOpen(false);
    setTransitioning(true);
    for (const issue of selectedIssues) {
      try { await api.post(`/issue/${issue.key}/transitions`, { transition: { id: t.id } }); }
      catch { /* continue */ }
    }
    setTransitioning(false);
    setSelected(new Set());
    window.dispatchEvent(new CustomEvent('issues-bulk-transitioned'));
  }

  async function exportXlsx() {
    const XLSX = await import('xlsx');
    const headers = visibleCols.map(c => c.label);
    const rows: string[][] = [headers];

    for (const group of groups) {
      if (groupBy !== 'none' && group.label) {
        rows.push([group.label, ...Array<string>(headers.length - 1).fill('')]);
      }
      for (const issue of group.issues) {
        rows.push(visibleCols.map(c => getCellText(c.key, issue)));
      }
    }

    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Issues');
    XLSX.writeFile(wb, `issues-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  if (isLoading) {
    return (
      <div className="space-y-2 mt-4">
        {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
      </div>
    );
  }

  return (
    <div>
      {/* ── Toolbar ───────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-3 gap-4 flex-wrap">
        {/* Group by */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#5E6C84] dark:text-gray-400 font-medium whitespace-nowrap">
            Group by:
          </span>
          <div className="flex rounded border border-[#DFE1E6] dark:border-gray-600 overflow-hidden">
            {(Object.keys(GROUP_BY_LABELS) as GroupBy[]).map(g => (
              <button
                key={g}
                onClick={() => setGroupBy(g)}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium transition-colors border-r border-[#DFE1E6] dark:border-gray-600 last:border-r-0 whitespace-nowrap',
                  groupBy === g
                    ? 'bg-[#0052CC] text-white'
                    : 'bg-white dark:bg-gray-800 text-[#5E6C84] dark:text-gray-400 hover:bg-[#F4F5F7] dark:hover:bg-gray-700',
                )}
              >
                {GROUP_BY_LABELS[g]}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Column picker */}
          <div className="relative" ref={colPickerRef}>
            <button
              onClick={() => setShowColPicker(p => !p)}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-white dark:bg-gray-800 border border-[#DFE1E6] dark:border-gray-600 rounded text-[#172B4D] dark:text-gray-200 hover:border-[#0052CC] transition-colors"
            >
              <Columns size={13} />
              Columns
            </button>
            {showColumnPicker && (
              <div className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-800 border border-[#DFE1E6] dark:border-gray-700 rounded shadow-lg z-30 w-44">
                <div className="px-3 py-2 border-b border-[#DFE1E6] dark:border-gray-700">
                  <span className="text-xs font-semibold text-[#172B4D] dark:text-gray-100">
                    Toggle columns
                  </span>
                </div>
                {COLUMNS.map(col => (
                  <button
                    key={col.key}
                    onClick={() => toggleColumn(col.key)}
                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-[#F4F5F7] dark:hover:bg-gray-700 transition-colors"
                  >
                    <div className={cn(
                      'w-4 h-4 rounded border flex items-center justify-center flex-shrink-0',
                      visibleColumns.has(col.key)
                        ? 'bg-[#0052CC] border-[#0052CC]'
                        : 'border-[#DFE1E6] dark:border-gray-500',
                    )}>
                      {visibleColumns.has(col.key) && <Check size={10} className="text-white" />}
                    </div>
                    <span className="text-xs text-[#172B4D] dark:text-gray-200 text-left">
                      {col.label}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Export */}
          <button
            onClick={exportXlsx}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-white dark:bg-gray-800 border border-[#DFE1E6] dark:border-gray-600 rounded text-[#172B4D] dark:text-gray-200 hover:border-[#0052CC] transition-colors"
          >
            <Download size={13} />
            Export
          </button>
        </div>
      </div>

      {/* ── Bulk action bar ───────────────────────────────────── */}
      {selectedCount > 0 && (
        <div className="flex items-center gap-2 mb-3 px-4 py-2.5 bg-[#E6F0FF] dark:bg-blue-900/30 border border-[#0052CC]/30 dark:border-blue-600/30 rounded-sm flex-wrap">
          <span className="text-sm font-medium text-[#0052CC] dark:text-blue-300 mr-1">
            {selectedCount} selected
          </span>

          {/* Transition */}
          <div className="relative">
            <button
              onClick={() => setTransDropOpen(p => !p)}
              disabled={transitioning || bulkApplying}
              className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 bg-white dark:bg-gray-800 border border-[#DFE1E6] dark:border-gray-600 rounded text-[#172B4D] dark:text-gray-100 hover:border-[#0052CC] transition-colors disabled:opacity-50"
            >
              {transitioning
                ? <Loader2 size={11} className="animate-spin" />
                : <ChevronDown size={11} />}
              Transition to…
            </button>
            {transitionDropOpen && (
              <div className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 border border-[#DFE1E6] dark:border-gray-700 rounded shadow-lg z-20 min-w-[160px] py-1">
                {transitionsLoading ? (
                  <div className="flex items-center gap-2 px-3 py-2 text-xs text-[#5E6C84]">
                    <Loader2 size={12} className="animate-spin" /> Loading…
                  </div>
                ) : commonTransitions.length === 0 ? (
                  <div className="px-3 py-2 text-xs text-[#5E6C84] dark:text-gray-400">
                    No transitions available
                  </div>
                ) : (
                  commonTransitions.map(t => (
                    <button
                      key={t.id}
                      onClick={() => applyTransition(t)}
                      disabled={transitioning}
                      className="w-full text-left text-xs px-3 py-2 text-[#172B4D] dark:text-gray-200 hover:bg-[#F4F5F7] dark:hover:bg-gray-700 border-b border-[#DFE1E6] dark:border-gray-700 last:border-b-0 transition-colors disabled:opacity-50"
                    >
                      {t.name}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Bulk assign */}
          <div className="relative" ref={bulkAssignRef}>
            <button
              onClick={() => { setBulkAssignOpen(p => !p); setBulkPriorityOpen(false); setBulkDueOpen(false); }}
              disabled={bulkApplying}
              className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 bg-white dark:bg-gray-800 border border-[#DFE1E6] dark:border-gray-600 rounded text-[#172B4D] dark:text-gray-100 hover:border-[#0052CC] transition-colors disabled:opacity-50"
            >
              <User size={11} />
              Assign to…
            </button>
            {bulkAssignOpen && (
              <div className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 border border-[#DFE1E6] dark:border-gray-700 rounded shadow-lg z-20 p-3 min-w-[220px]">
                <p className="text-[10px] text-[#5E6C84] dark:text-gray-400 mb-2 font-semibold uppercase">Assign {selectedCount} issue{selectedCount > 1 ? 's' : ''} to</p>
                <input
                  autoFocus
                  type="text"
                  value={bulkAssignQuery}
                  onChange={e => setBulkAssignQuery(e.target.value)}
                  placeholder="Username…"
                  className="w-full text-xs border border-[#DFE1E6] dark:border-gray-600 rounded px-2 py-1.5 bg-white dark:bg-gray-800 text-[#172B4D] dark:text-gray-100 focus:outline-none focus:border-[#0052CC] mb-2"
                />
                <div className="flex gap-1.5">
                  <button
                    onClick={() => applyBulkField({ assignee: bulkAssignQuery ? { name: bulkAssignQuery } : null })}
                    disabled={bulkApplying}
                    className="flex-1 text-xs px-2 py-1.5 bg-[#0052CC] text-white rounded hover:bg-[#0747A6] disabled:opacity-50 transition-colors"
                  >
                    {bulkApplying ? <Loader2 size={11} className="animate-spin mx-auto" /> : 'Apply'}
                  </button>
                  <button onClick={() => setBulkAssignOpen(false)} className="text-xs px-2 py-1.5 border border-[#DFE1E6] rounded text-[#5E6C84] hover:text-[#172B4D]">Cancel</button>
                </div>
              </div>
            )}
          </div>

          {/* Bulk priority */}
          <div className="relative" ref={bulkPriorityRef}>
            <button
              onClick={() => { setBulkPriorityOpen(p => !p); setBulkAssignOpen(false); setBulkDueOpen(false); }}
              disabled={bulkApplying}
              className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 bg-white dark:bg-gray-800 border border-[#DFE1E6] dark:border-gray-600 rounded text-[#172B4D] dark:text-gray-100 hover:border-[#0052CC] transition-colors disabled:opacity-50"
            >
              <ChevronDown size={11} />
              Set priority…
            </button>
            {bulkPriorityOpen && (
              <div className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 border border-[#DFE1E6] dark:border-gray-700 rounded shadow-lg z-20 min-w-[140px] py-1">
                {PRIORITY_NAMES.map(p => (
                  <button
                    key={p}
                    onClick={() => { setBulkPriority(p); applyBulkField({ priority: { name: p } }); }}
                    disabled={bulkApplying}
                    className={cn(
                      'w-full text-left text-xs px-3 py-2 hover:bg-[#F4F5F7] dark:hover:bg-gray-700 transition-colors disabled:opacity-50',
                      bulkPriority === p && 'text-[#0052CC] font-semibold',
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Bulk due date */}
          <div className="relative" ref={bulkDueRef}>
            <button
              onClick={() => { setBulkDueOpen(p => !p); setBulkAssignOpen(false); setBulkPriorityOpen(false); }}
              disabled={bulkApplying}
              className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 bg-white dark:bg-gray-800 border border-[#DFE1E6] dark:border-gray-600 rounded text-[#172B4D] dark:text-gray-100 hover:border-[#0052CC] transition-colors disabled:opacity-50"
            >
              <Calendar size={11} />
              Set due date…
            </button>
            {bulkDueOpen && (
              <div className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 border border-[#DFE1E6] dark:border-gray-700 rounded shadow-lg z-20 p-3 min-w-[200px]">
                <p className="text-[10px] text-[#5E6C84] dark:text-gray-400 mb-2 font-semibold uppercase">Due date for {selectedCount} issue{selectedCount > 1 ? 's' : ''}</p>
                <input
                  autoFocus
                  type="date"
                  value={bulkDue}
                  onChange={e => setBulkDue(e.target.value)}
                  className="w-full text-xs border border-[#DFE1E6] dark:border-gray-600 rounded px-2 py-1.5 bg-white dark:bg-gray-800 text-[#172B4D] dark:text-gray-100 focus:outline-none focus:border-[#0052CC] mb-2"
                />
                <div className="flex gap-1.5">
                  <button
                    onClick={() => applyBulkField({ duedate: bulkDue || null })}
                    disabled={bulkApplying}
                    className="flex-1 text-xs px-2 py-1.5 bg-[#0052CC] text-white rounded hover:bg-[#0747A6] disabled:opacity-50 transition-colors"
                  >
                    {bulkApplying ? <Loader2 size={11} className="animate-spin mx-auto" /> : 'Apply'}
                  </button>
                  <button onClick={() => setBulkDueOpen(false)} className="text-xs px-2 py-1.5 border border-[#DFE1E6] rounded text-[#5E6C84] hover:text-[#172B4D]">Cancel</button>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => setSelected(new Set())}
            className="flex items-center gap-1 text-xs text-[#5E6C84] dark:text-gray-400 hover:text-[#172B4D] dark:hover:text-gray-200 ml-auto transition-colors"
          >
            <X size={12} /> Clear
          </button>
        </div>
      )}

      {/* ── Table ─────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-gray-800 rounded-sm border border-[#DFE1E6] dark:border-gray-700">
        {/* Sticky header */}
        <div className="flex items-center gap-3 px-4 py-2 bg-[#F4F5F7] dark:bg-gray-700 border-b border-[#DFE1E6] dark:border-gray-600 sticky top-0 z-10 rounded-t-sm">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={toggleSelectAll}
            className="w-3.5 h-3.5 rounded border-[#DFE1E6] flex-shrink-0 cursor-pointer accent-[#0052CC]"
            aria-label="Select all"
          />
          {visibleCols.map(col => col.sortField ? (
            <SortableHeader
              key={col.key}
              label={col.label}
              field={col.sortField}
              sortField={sortField}
              sortDir={sortDir}
              onSort={onSortChange}
              className={cn(
                col.widthClass,
                col.key !== 'summary' ? 'flex-shrink-0' : 'min-w-0 overflow-hidden',
              )}
            />
          ) : (
            <span
              key={col.key}
              className={cn(
                'text-xs font-semibold text-[#5E6C84] dark:text-gray-400 uppercase tracking-wide',
                col.widthClass,
                col.key !== 'summary' ? 'flex-shrink-0' : 'min-w-0 overflow-hidden',
              )}
            >
              {col.label}
            </span>
          ))}
        </div>

        {issues.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-sm text-[#5E6C84] dark:text-gray-400">
            No issues found
          </div>
        ) : (
          groups.map(group => {
            const collapsed = collapsedGroups.has(group.key);
            return (
              <div key={group.key}>
                {groupBy !== 'none' && (
                  <button
                    onClick={() => toggleGroup(group.key)}
                    className="w-full flex items-center gap-2 px-4 py-2 bg-[#F4F5F7] dark:bg-gray-750 hover:bg-[#EBECF0] dark:hover:bg-gray-700 border-b border-[#DFE1E6] dark:border-gray-600 transition-colors"
                  >
                    {collapsed
                      ? <ChevronRight size={13} className="text-[#5E6C84] flex-shrink-0" />
                      : <ChevronDown  size={13} className="text-[#5E6C84] flex-shrink-0" />}
                    <FolderOpen size={13} className="text-[#5E6C84] flex-shrink-0" />
                    <span className="text-xs font-semibold text-[#172B4D] dark:text-gray-100">
                      {group.label}
                    </span>
                    <span className="text-xs text-[#5E6C84] dark:text-gray-400 font-medium">
                      ({group.issues.length})
                    </span>
                  </button>
                )}
                {!collapsed && group.issues.map(issue => (
                  <IssueTableRow
                    key={issue.id}
                    issue={issue}
                    selected={selected.has(issue.id)}
                    onToggle={() => toggleSelect(issue.id)}
                    visibleCols={visibleCols}
                    onOpenPanel={setPanelKey}
                    onInlineSaved={() => window.dispatchEvent(new CustomEvent('issues-bulk-transitioned'))}
                  />
                ))}
              </div>
            );
          })
        )}
      </div>

      {/* Footer count */}
      {total > 0 && (
        <div className="mt-2 px-1">
          <span className="text-xs text-[#5E6C84] dark:text-gray-400">
            {issues.length < total
              ? `Showing ${issues.length} / ${total} issues`
              : `${total} issues`}
          </span>
        </div>
      )}

      {/* Issue detail panel */}
      <IssueDetailPanel
        issueKey={panelKey}
        onClose={() => setPanelKey(null)}
        onUpdated={() => window.dispatchEvent(new CustomEvent('issues-bulk-transitioned'))}
      />
    </div>
  );
}
