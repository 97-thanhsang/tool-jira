'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { ExternalLink, X, Search, Loader2 } from 'lucide-react';
import type { JiraIssue, JiraUser, JiraPriority } from '@/types/jira';
import { PriorityIcon } from '@/components/shared/priority-icon';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';

export interface IssueCardProps {
  issue: JiraIssue;
  /** Called when the user clicks the issue summary (opens Quick View) */
  onCardClick?: (key: string) => void;
  /** Called after any inline edit succeeds — parent should revalidate data */
  onIssueUpdate?: () => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const issueTypeColors: Record<string, string> = {
  Story:           'bg-[#36B37E] text-white',
  'Sub-task':      'bg-[#0052CC] text-white',
  Bug:             'bg-[#DE350B] text-white',
  Task:            'bg-[#4BADE8] text-white',
  Epic:            'bg-[#904EE2] text-white',
  Support:         'bg-[#FF8B00] text-white',
  Enhancement:     'bg-[#008DA6] text-white',
  Improvement:     'bg-[#6554C0] text-white',
  'New Feature':   'bg-[#E774BB] text-white',
  'Build Release': 'bg-[#7A869A] text-white',
  'Bug after release': 'bg-[#BF2600] text-white',
  WBS:             'bg-[#505F79] text-white',
};

const PRIORITY_OPTIONS: Array<{ name: JiraPriority['name']; color: string }> = [
  { name: 'Highest', color: '#DE350B' },
  { name: 'High',    color: '#FF5630' },
  { name: 'Medium',  color: '#FFAB00' },
  { name: 'Low',     color: '#2684FF' },
  { name: 'Lowest',  color: '#2684FF' },
  { name: 'Blocker', color: '#DE350B' },
  { name: 'Minor',   color: '#6B778C' },
];

const LABEL_COLORS = [
  '#0052CC', '#36B37E', '#DE350B', '#FF8B00',
  '#6554C0', '#008DA6', '#E774BB', '#FF5630',
  '#00B8D9', '#8777D9',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function issueTypeLabel(name: string): string {
  if (name === 'Sub-task') return 'SUB';
  if (name === 'Story')    return 'STR';
  if (name === 'Bug')      return 'BUG';
  return name.slice(0, 3).toUpperCase();
}

function getDueDateStatus(duedate?: string): 'overdue' | 'due-soon' | null {
  if (!duedate) return null;
  const now  = new Date();
  const due  = new Date(duedate);
  if (due < now) return 'overdue';
  const msIn3Days = 3 * 24 * 60 * 60 * 1000;
  if (due.getTime() - now.getTime() <= msIn3Days) return 'due-soon';
  return null;
}

function daysSince(dateStr: string): number | null {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  if (diff < 0) return null;
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function labelColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return LABEL_COLORS[Math.abs(hash) % LABEL_COLORS.length];
}

// ─── API helpers ──────────────────────────────────────────────────────────────

async function searchUsers(query: string): Promise<JiraUser[]> {
  const res = await api.get('/user/search', {
    params: { username: query, maxResults: 8 },
  });
  return Array.isArray(res.data) ? res.data : (res.data?.values ?? []);
}

async function assignIssue(key: string, username: string | null): Promise<void> {
  await api.put(`/issue/${key}/assignee`, { name: username ?? '-1' });
}

async function updateIssuePriority(key: string, priorityName: string): Promise<void> {
  await api.put(`/issue/${key}`, {
    fields: { priority: { name: priorityName } },
  });
}

async function addIssueLabel(key: string, label: string): Promise<void> {
  await api.put(`/issue/${key}`, {
    update: { labels: [{ add: label }] },
  });
}

async function removeIssueLabel(key: string, label: string): Promise<void> {
  await api.put(`/issue/${key}`, {
    update: { labels: [{ remove: label }] },
  });
}

// ─── Popover wrapper styles ───────────────────────────────────────────────────

const POPOVER_BASE =
  'absolute bottom-full left-0 mb-1 z-50 bg-white dark:bg-gray-800 border border-[#DFE1E6] dark:border-gray-600 rounded-sm shadow-lg';

const POPOVER_ITEM =
  'w-full flex items-center gap-2 text-left px-3 py-1.5 text-xs transition-colors text-[#172B4D] dark:text-gray-200 hover:bg-[#F4F5F7] dark:hover:bg-gray-700';

// ─── Main component ───────────────────────────────────────────────────────────

export function IssueCard({ issue, onCardClick, onIssueUpdate }: IssueCardProps) {
  // ── Derived values ──────────────────────────────────────────────────────
  const typeColor  = issueTypeColors[issue.fields.issuetype?.name ?? ''] ?? 'bg-gray-400 text-white';
  const dueDateStatus = getDueDateStatus(issue.fields.duedate);
  const daysOld = daysSince(issue.fields.updated);
  const components = issue.fields.components ?? [];

  // ── Optimistic state ─────────────────────────────────────────────────────
  // undefined = use original from issue; null = explicit unassigned; JiraUser = assigned
  const [optAssignee, setOptAssignee] = useState<JiraUser | null | undefined>(undefined);
  const [optPriority, setOptPriority] = useState<JiraPriority | undefined>(undefined);
  const [optLabels, setOptLabels] = useState<string[] | undefined>(undefined);

  // Derived display values
  const displayAssignee = optAssignee !== undefined ? optAssignee : issue.fields.assignee;
  const displayPriority = optPriority ?? issue.fields.priority;
  const displayLabels = optLabels ?? (issue.fields.labels ?? []);
  const hasTags = displayLabels.length > 0 || components.length > 0;

  // ── Popover state ────────────────────────────────────────────────────────
  const [openPopover, setOpenPopover] = useState<'assignee' | 'priority' | 'labels' | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // ── User search state ────────────────────────────────────────────────────
  const [userQuery, setUserQuery] = useState('');
  const [userResults, setUserResults] = useState<JiraUser[]>([]);
  const [userSearching, setUserSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Label input state ────────────────────────────────────────────────────
  const [labelInput, setLabelInput] = useState('');
  const [labelSubmitting, setLabelSubmitting] = useState(false);

  // ── Click-outside handler ────────────────────────────────────────────────
  useEffect(() => {
    if (!openPopover) return;
    function handleClickOutside(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpenPopover(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openPopover]);

  // ── Debounced user search ────────────────────────────────────────────────
  const doUserSearch = useCallback((q: string) => {
    if (q.length < 1) {
      setUserResults([]);
      return;
    }
    setUserSearching(true);
    searchUsers(q)
      .then(setUserResults)
      .catch(() => setUserResults([]))
      .finally(() => setUserSearching(false));
  }, []);

  useEffect(() => {
    if (openPopover !== 'assignee') return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doUserSearch(userQuery), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [userQuery, openPopover, doUserSearch]);

  // Reset search state when popover closes
  useEffect(() => {
    if (!openPopover) {
      setUserQuery('');
      setUserResults([]);
    }
  }, [openPopover]);

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleTogglePopover = useCallback(
    (kind: 'assignee' | 'priority' | 'labels', e: React.MouseEvent | React.PointerEvent) => {
      e.stopPropagation();
      e.preventDefault();
      setOpenPopover((prev) => (prev === kind ? null : kind));
    },
    [],
  );

  const handleAssign = useCallback(
    async (user: JiraUser | null) => {
      setOptAssignee(user);
      setOpenPopover(null);
      try {
        await assignIssue(issue.key, user?.name ?? null);
        onIssueUpdate?.();
      } catch {
        setOptAssignee(undefined); // revert
      }
    },
    [issue.key, onIssueUpdate],
  );

  const handlePriorityChange = useCallback(
    async (p: JiraPriority) => {
      setOptPriority(p);
      setOpenPopover(null);
      try {
        await updateIssuePriority(issue.key, p.name);
        onIssueUpdate?.();
      } catch {
        setOptPriority(undefined); // revert
      }
    },
    [issue.key, onIssueUpdate],
  );

  const handleAddLabel = useCallback(
    async (label: string) => {
      const prev = displayLabels;
      setOptLabels([...prev, label]);
      setLabelInput('');
      setLabelSubmitting(true);
      try {
        await addIssueLabel(issue.key, label);
        onIssueUpdate?.();
      } catch {
        setOptLabels(prev); // revert
        setLabelInput(label); // restore input
      } finally {
        setLabelSubmitting(false);
      }
    },
    [issue.key, displayLabels, onIssueUpdate],
  );

  const handleRemoveLabel = useCallback(
    async (label: string) => {
      const prev = displayLabels;
      setOptLabels(prev.filter((l) => l !== label));
      setLabelSubmitting(true);
      try {
        await removeIssueLabel(issue.key, label);
        onIssueUpdate?.();
      } catch {
        setOptLabels(prev); // revert
      } finally {
        setLabelSubmitting(false);
      }
    },
    [issue.key, displayLabels, onIssueUpdate],
  );

  const handleLabelKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && labelInput.trim()) {
        e.preventDefault();
        handleAddLabel(labelInput.trim());
      }
    },
    [labelInput, handleAddLabel],
  );

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <Card
      className={cn(
        'group relative p-3 bg-white dark:bg-gray-800 border border-[#DFE1E6] dark:border-gray-700 rounded-sm hover:shadow-md transition-shadow',
        dueDateStatus === 'overdue'  && 'border-l-2 border-l-red-500',
        dueDateStatus === 'due-soon' && 'border-l-2 border-l-orange-400',
      )}
    >
      {/* Type badge + key + external link */}
      <div className="flex items-center gap-1.5 mb-2">
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-sm ${typeColor}`}>
          {issueTypeLabel(issue.fields.issuetype?.name ?? '')}
        </span>
        <Link
          href={`/issues/${issue.key}`}
          className="text-xs text-[#0052CC] dark:text-blue-400 font-medium hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {issue.key}
        </Link>
        <a
          href={`https://task.ascvn.com.vn/browse/${issue.key}`}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto opacity-0 group-hover:opacity-100 text-[#5E6C84] hover:text-[#0052CC] transition-opacity"
          title="Open in Jira"
          onClick={(e) => e.stopPropagation()}
        >
          <ExternalLink size={12} />
        </a>
      </div>

      {/* Summary — click opens Quick View */}
      <button
        type="button"
        onClick={() => onCardClick?.(issue.key)}
        className="w-full text-left mb-2"
      >
        <p className="text-sm text-[#172B4D] dark:text-gray-200 leading-snug line-clamp-2 hover:text-[#0052CC] dark:hover:text-blue-400 transition-colors">
          {issue.fields.summary}
        </p>
      </button>

      {/* Labels + Components chips — clickable for inline label edit */}
      <div className="relative">
        <button
          type="button"
          className="w-full text-left cursor-pointer"
          onClick={(e) => handleTogglePopover('labels', e)}
          onPointerDown={(e) => e.stopPropagation()}
        >
          {hasTags ? (
            <div className="flex items-center gap-1 flex-wrap mb-2">
              {components.map((c) => (
                <span
                  key={c.id}
                  className="text-[10px] px-1.5 py-0.5 rounded-sm bg-[#DFE1E6] dark:bg-gray-700 text-[#5E6C84] dark:text-gray-400"
                >
                  {c.name}
                </span>
              ))}
              {displayLabels.map((label) => (
                <span
                  key={label}
                  className="text-[10px] font-medium px-1.5 py-0.5 rounded-sm text-white"
                  style={{ backgroundColor: labelColor(label) }}
                >
                  {label}
                </span>
              ))}
            </div>
          ) : (
            <div className="mb-2 text-[10px] text-[#8993A4] dark:text-gray-500 hover:text-[#5E6C84] dark:hover:text-gray-400 transition-colors">
              + Add labels
            </div>
          )}
        </button>

        {/* Labels popover */}
        {openPopover === 'labels' && (
          <div
            ref={popoverRef}
            className={cn(POPOVER_BASE, 'w-56')}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Current labels */}
            {displayLabels.length > 0 && (
              <div className="p-2 space-y-1 border-b border-[#DFE1E6] dark:border-gray-600">
                {displayLabels.map((label) => (
                  <div
                    key={label}
                    className="flex items-center justify-between px-2 py-0.5 text-[10px] font-medium rounded-sm text-white"
                    style={{ backgroundColor: labelColor(label) }}
                  >
                    <span>{label}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveLabel(label)}
                      disabled={labelSubmitting}
                      className="ml-1 opacity-70 hover:opacity-100"
                    >
                      <X size={10} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {/* Add label input */}
            <div className="p-2">
              <input
                type="text"
                value={labelInput}
                onChange={(e) => setLabelInput(e.target.value)}
                onKeyDown={handleLabelKeyDown}
                placeholder="Type label + Enter"
                disabled={labelSubmitting}
                className="w-full text-xs border border-[#DFE1E6] dark:border-gray-600 rounded px-2 py-1.5 bg-white dark:bg-gray-800 text-[#172B4D] dark:text-gray-100 placeholder:text-[#8993A4] dark:placeholder:text-gray-500 focus:outline-none focus:border-[#0052CC] dark:focus:border-blue-400"
                autoFocus
              />
            </div>
          </div>
        )}
      </div>

      {/* Due date badges */}
      {dueDateStatus && (
        <div className="mb-2">
          {dueDateStatus === 'overdue' && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-sm bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
              Overdue
            </span>
          )}
          {dueDateStatus === 'due-soon' && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-sm bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400">
              Due soon
            </span>
          )}
        </div>
      )}

      {/* Footer: priority + project + days ago + assignee avatar */}
      <div className="flex items-center gap-2">
        {/* Priority — clickable for inline edit */}
        <div className="relative">
          <button
            type="button"
            onClick={(e) => handleTogglePopover('priority', e)}
            onPointerDown={(e) => e.stopPropagation()}
            className="flex-shrink-0 cursor-pointer"
            title={displayPriority?.name ?? 'No priority'}
          >
            <PriorityIcon priority={displayPriority} />
          </button>

          {/* Priority popover */}
          {openPopover === 'priority' && (
            <div
              ref={popoverRef}
              className={cn(POPOVER_BASE, 'w-36')}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
            >
              {PRIORITY_OPTIONS.map((p) => {
                const isActive = displayPriority?.name === p.name;
                return (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() =>
                      handlePriorityChange({ name: p.name, iconUrl: '' })
                    }
                    className={cn(
                      POPOVER_ITEM,
                      isActive && 'bg-[#F4F5F7] dark:bg-gray-700 font-semibold',
                    )}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: p.color }}
                    />
                    <span>{p.name}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <span className="text-[10px] text-[#5E6C84] dark:text-gray-400 truncate flex-1">
          {issue.fields.project?.name}
        </span>

        {/* Days since updated */}
        {daysOld != null && (
          <span className="text-[10px] text-[#8993A4] dark:text-gray-500 flex-shrink-0">
            {daysOld}d
          </span>
        )}

        {/* Assignee avatar — clickable for inline edit */}
        <div className="relative">
          <button
            type="button"
            onClick={(e) => handleTogglePopover('assignee', e)}
            onPointerDown={(e) => e.stopPropagation()}
            className="flex-shrink-0 cursor-pointer"
          >
            {displayAssignee ? (
              <img
                src={displayAssignee.avatarUrls['24x24']}
                alt={displayAssignee.displayName}
                title={displayAssignee.displayName}
                className="w-5 h-5 rounded-full border border-[#DFE1E6] dark:border-gray-600 hover:opacity-80 transition-opacity"
              />
            ) : (
              <div
                className="w-5 h-5 rounded-full bg-[#DFE1E6] dark:bg-gray-700 flex items-center justify-center text-[10px] text-[#5E6C84] dark:text-gray-400 hover:opacity-80 transition-opacity"
                title="Unassigned"
              >
                ?
              </div>
            )}
          </button>

          {/* Assignee popover */}
          {openPopover === 'assignee' && (
            <div
              ref={popoverRef}
              className={cn(POPOVER_BASE, 'w-60')}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Unassigned option */}
              <button
                type="button"
                onClick={() => handleAssign(null)}
                className={cn(
                  POPOVER_ITEM,
                  !displayAssignee && 'bg-[#F4F5F7] dark:bg-gray-700 font-semibold',
                )}
              >
                <div className="w-5 h-5 rounded-full bg-[#DFE1E6] dark:bg-gray-600 flex items-center justify-center text-[10px] flex-shrink-0">?</div>
                <span>Unassigned</span>
              </button>

              {/* Divider */}
              <div className="border-t border-[#DFE1E6] dark:border-gray-600 my-0.5" />

              {/* Search input */}
              <div className="px-2 py-1">
                <div className="relative">
                  <Search
                    size={12}
                    className="absolute left-2 top-1/2 -translate-y-1/2 text-[#5E6C84] dark:text-gray-500 pointer-events-none"
                  />
                  <input
                    type="text"
                    value={userQuery}
                    onChange={(e) => setUserQuery(e.target.value)}
                    placeholder="Search users..."
                    className="w-full text-xs border border-[#DFE1E6] dark:border-gray-600 rounded pl-7 pr-2 py-1.5 bg-white dark:bg-gray-800 text-[#172B4D] dark:text-gray-100 placeholder:text-[#8993A4] dark:placeholder:text-gray-500 focus:outline-none focus:border-[#0052CC] dark:focus:border-blue-400"
                    autoFocus
                  />
                </div>
              </div>

              {/* User results */}
              <div className="max-h-48 overflow-y-auto">
                {userSearching && (
                  <div className="flex items-center gap-2 px-3 py-2 text-xs text-[#5E6C84] dark:text-gray-400">
                    <Loader2 size={12} className="animate-spin" />
                    Searching...
                  </div>
                )}

                {!userSearching &&
                  userResults.map((user) => {
                    const isActive = displayAssignee?.name === user.name;
                    return (
                      <button
                        key={user.name}
                        type="button"
                        onClick={() => handleAssign(user)}
                        className={cn(
                          POPOVER_ITEM,
                          isActive && 'bg-[#F4F5F7] dark:bg-gray-700 font-semibold',
                        )}
                      >
                        <img
                          src={user.avatarUrls['24x24']}
                          alt=""
                          className="w-5 h-5 rounded-full flex-shrink-0"
                        />
                        <span>{user.displayName}</span>
                        {isActive && (
                          <span className="ml-auto text-[10px] text-[#8993A4] dark:text-gray-500">current</span>
                        )}
                      </button>
                    );
                  })}

                {!userSearching && userQuery.length >= 1 && userResults.length === 0 && (
                  <div className="px-3 py-2 text-xs text-[#5E6C84] dark:text-gray-400">
                    No users found
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
