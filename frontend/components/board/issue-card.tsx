'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { ExternalLink, X, Search, Loader2 } from 'lucide-react';
import type { JiraIssue, JiraUser, JiraPriority } from '@/types/jira';
import { PriorityIcon } from '@/components/shared/priority-icon';
import { cn } from '@/lib/utils';
import { useDndContext } from '@dnd-kit/core';

export interface IssueCardProps {
  issue: JiraIssue;
  onCardClick?: (key: string) => void;
  onIssueUpdate?: () => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const issueTypeColors: Record<string, string> = {
  Story: 'bg-[#36B37E] text-white', 'Sub-task': 'bg-[#0052CC] text-white',
  Bug: 'bg-[#DE350B] text-white', Task: 'bg-[#4BADE8] text-white',
  Epic: 'bg-[#904EE2] text-white', Support: 'bg-[#FF8B00] text-white',
  Enhancement: 'bg-[#008DA6] text-white', Improvement: 'bg-[#6554C0] text-white',
  'New Feature': 'bg-[#E774BB] text-white', 'Build Release': 'bg-[#7A869A] text-white',
  'Bug after release': 'bg-[#BF2600] text-white', WBS: 'bg-[#505F79] text-white',
};

const STATUS_CATEGORY_COLORS: Record<string, string> = {
  new: 'bg-[#DFE1E6]', indeterminate: 'bg-[#0052CC]', done: 'bg-[#36B37E]',
};

const PRIORITY_OPTIONS: Array<{ name: JiraPriority['name']; color: string }> = [
  { name: 'Highest', color: '#DE350B' }, { name: 'High', color: '#FF5630' },
  { name: 'Medium', color: '#FFAB00' }, { name: 'Low', color: '#2684FF' },
  { name: 'Lowest', color: '#2684FF' }, { name: 'Blocker', color: '#DE350B' },
  { name: 'Minor', color: '#6B778C' },
];

const LABEL_COLORS = ['#0052CC', '#36B37E', '#DE350B', '#FF8B00', '#6554C0', '#008DA6', '#E774BB', '#FF5630', '#00B8D9', '#8777D9'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function issueTypeLabel(name: string): string {
  if (name === 'Sub-task') return 'SUB';
  if (name === 'Story') return 'STR';
  if (name === 'Bug') return 'BUG';
  return name.slice(0, 3).toUpperCase();
}

function getDueDateStatus(duedate?: string): 'overdue' | 'due-soon' | null {
  if (!duedate) return 'overdue'; // no duedate = red
  const now = new Date();
  const due = new Date(duedate);
  if (due < now) return 'overdue';
  if (due.getTime() - now.getTime() <= 3 * 24 * 60 * 60 * 1000) return 'due-soon';
  return null;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}`;
}

function formatHours(seconds: number): string {
  if (!seconds) return '0h';
  const h = seconds / 3600;
  return h >= 10 ? `${Math.round(h)}h` : `${h.toFixed(1)}h`;
}

/** Parse Jira duration string like "2h 30m" or "1d 4h" to seconds. */
function parseJiraDuration(dur: string): number {
  let total = 0;
  const dayMatch = dur.match(/(\d+(?:\.\d+)?)d/);
  if (dayMatch) total += parseFloat(dayMatch[1]) * 8 * 3600; // 1d = 8h
  const hourMatch = dur.match(/(\d+(?:\.\d+)?)h/);
  if (hourMatch) total += parseFloat(hourMatch[1]) * 3600;
  const minMatch = dur.match(/(\d+(?:\.\d+)?)m/);
  if (minMatch) total += parseFloat(minMatch[1]) * 60;
  return total;
}

function labelColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return LABEL_COLORS[Math.abs(hash) % LABEL_COLORS.length];
}

/** Extract story points from common custom fields. */
function getStoryPoints(issue: JiraIssue): number | null {
  const raw = issue.fields as Record<string, unknown>;
  for (const cf of ['customfield_10006', 'customfield_10002', 'customfield_10004']) {
    const v = raw[cf];
    if (typeof v === 'number' && v > 0) return v;
  }
  return null;
}

/** Get active sprint name. */
function getSprintName(issue: JiraIssue): string | null {
  const sprint = issue.fields.sprint;
  if (sprint) {
    if (Array.isArray(sprint)) {
      const active = sprint.find(s => s.state === 'active');
      if (active) return active.name;
    } else {
      return sprint.name;
    }
  }
  const cf = issue.fields.customfield_10020;
  if (cf) {
    if (Array.isArray(cf)) {
      const active = cf.find(s => s.state === 'active');
      if (active) return active.name;
    } else {
      return cf.name;
    }
  }
  return null;
}

// ─── API helpers ──────────────────────────────────────────────────────────────

async function searchUsers(query: string): Promise<JiraUser[]> {
  const res = await api.get('/user/search', { params: { username: query, maxResults: 8 } });
  return Array.isArray(res.data) ? res.data : (res.data?.values ?? []);
}

async function assignIssue(key: string, username: string | null): Promise<void> {
  await api.put(`/issue/${key}/assignee`, { name: username ?? '-1' });
}

async function updateIssuePriority(key: string, priorityName: string): Promise<void> {
  await api.put(`/issue/${key}`, { fields: { priority: { name: priorityName } } });
}

async function addIssueLabel(key: string, label: string): Promise<void> {
  await api.put(`/issue/${key}`, { update: { labels: [{ add: label }] } });
}

async function removeIssueLabel(key: string, label: string): Promise<void> {
  await api.put(`/issue/${key}`, { update: { labels: [{ remove: label }] } });
}

import { api } from '@/lib/api';

// ─── Styles ───────────────────────────────────────────────────────────────────

const POPOVER_BASE = 'absolute bottom-full left-0 mb-1 z-50 bg-white dark:bg-gray-800 border border-[#DFE1E6] dark:border-gray-600 rounded-sm shadow-lg';
const POPOVER_ITEM = 'w-full flex items-center gap-2 text-left px-3 py-1.5 text-xs transition-colors text-[#172B4D] dark:text-gray-200 hover:bg-[#F4F5F7] dark:hover:bg-gray-700';

// ─── Main component ───────────────────────────────────────────────────────────

export function IssueCard({ issue, onCardClick, onIssueUpdate }: IssueCardProps) {
  const { active: dndActive } = useDndContext();
  const isDraggingActive = !!dndActive;

  const typeColor = issueTypeColors[issue.fields.issuetype?.name ?? ''] ?? 'bg-gray-400 text-white';
  const statusCat = issue.fields.status.statusCategory.key;
  const dueDateStatus = statusCat === 'done' ? null : getDueDateStatus(issue.fields.duedate);
  const components = issue.fields.components ?? [];
  const storyPoints = getStoryPoints(issue);
  const sprintName = getSprintName(issue);
  const tt = issue.fields.timetracking;
  const loggedStr = tt?.timeSpent;
  const estimatedStr = tt?.originalEstimate;
  const logged = tt?.timeSpentSeconds ?? (loggedStr ? parseJiraDuration(loggedStr) : 0);
  const estimated = tt?.originalEstimateSeconds ?? (estimatedStr ? parseJiraDuration(estimatedStr) : 0);
  const hasTimeTracking = !!(estimated || logged);
  const progress = estimated > 0 ? Math.min(logged / estimated, 1) : 0;

  const [optAssignee, setOptAssignee] = useState<JiraUser | null | undefined>(undefined);
  const [optPriority, setOptPriority] = useState<JiraPriority | undefined>(undefined);
  const [optLabels, setOptLabels] = useState<string[] | undefined>(undefined);

  const displayAssignee = optAssignee !== undefined ? optAssignee : issue.fields.assignee;
  const displayPriority = optPriority ?? issue.fields.priority;
  const displayLabels = optLabels ?? (issue.fields.labels ?? []);
  const hasTags = displayLabels.length > 0 || components.length > 0;

  const [openPopover, setOpenPopover] = useState<'assignee' | 'priority' | 'labels' | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [userQuery, setUserQuery] = useState('');
  const [userResults, setUserResults] = useState<JiraUser[]>([]);
  const [userSearching, setUserSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [labelInput, setLabelInput] = useState('');
  const [labelSubmitting, setLabelSubmitting] = useState(false);

  useEffect(() => {
    if (!openPopover) return;
    function handler(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) setOpenPopover(null);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [openPopover]);

  const doUserSearch = useCallback((q: string) => {
    if (q.length < 1) { setUserResults([]); return; }
    setUserSearching(true);
    searchUsers(q).then(setUserResults).catch(() => setUserResults([])).finally(() => setUserSearching(false));
  }, []);

  useEffect(() => {
    if (openPopover !== 'assignee') return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doUserSearch(userQuery), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [userQuery, openPopover, doUserSearch]);

  useEffect(() => { if (!openPopover) { setUserQuery(''); setUserResults([]); } }, [openPopover]);

  const handleTogglePopover = useCallback((kind: 'assignee' | 'priority' | 'labels', e: React.MouseEvent | React.PointerEvent) => {
    e.stopPropagation(); e.preventDefault();
    setOpenPopover(prev => prev === kind ? null : kind);
  }, []);

  const handleAssign = useCallback(async (user: JiraUser | null) => {
    setOptAssignee(user); setOpenPopover(null);
    try { await assignIssue(issue.key, user?.name ?? null); onIssueUpdate?.(); }
    catch { setOptAssignee(undefined); }
  }, [issue.key, onIssueUpdate]);

  const handlePriorityChange = useCallback(async (p: JiraPriority) => {
    setOptPriority(p); setOpenPopover(null);
    try { await updateIssuePriority(issue.key, p.name); onIssueUpdate?.(); }
    catch { setOptPriority(undefined); }
  }, [issue.key, onIssueUpdate]);

  const handleAddLabel = useCallback(async (label: string) => {
    const prev = displayLabels;
    setOptLabels([...prev, label]); setLabelInput(''); setLabelSubmitting(true);
    try { await addIssueLabel(issue.key, label); onIssueUpdate?.(); }
    catch { setOptLabels(prev); setLabelInput(label); }
    finally { setLabelSubmitting(false); }
  }, [issue.key, displayLabels, onIssueUpdate]);

  const handleRemoveLabel = useCallback(async (label: string) => {
    const prev = displayLabels;
    setOptLabels(prev.filter(l => l !== label)); setLabelSubmitting(true);
    try { await removeIssueLabel(issue.key, label); onIssueUpdate?.(); }
    catch { setOptLabels(prev); }
    finally { setLabelSubmitting(false); }
  }, [issue.key, displayLabels, onIssueUpdate]);

  const handleLabelKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && labelInput.trim()) { e.preventDefault(); handleAddLabel(labelInput.trim()); }
  }, [labelInput, handleAddLabel]);

  return (
    <div
      className={cn(
        'group relative p-3 rounded-sm transition-all border border-[#DFE1E6] dark:border-gray-700',
        isDraggingActive && 'hover:shadow-md',
        (dueDateStatus === 'overdue' || (statusCat !== 'done' && !estimated))
          ? 'bg-red-50 dark:bg-red-950/20 border-l-2 border-l-red-500'
          : dueDateStatus === 'due-soon'
            ? 'bg-orange-50 dark:bg-orange-950/20 border-l-2 border-l-orange-400'
            : 'bg-white dark:bg-gray-800',
      )}
    >
      {/* Row 1: Status + Type badge + Key + External link */}
      <div className="flex items-center gap-1.5 mb-2">
        <span className={cn('w-2 h-2 rounded-full flex-shrink-0', STATUS_CATEGORY_COLORS[statusCat] ?? 'bg-gray-400')} title={issue.fields.status.name} />
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-sm ${typeColor}`}>
          {issueTypeLabel(issue.fields.issuetype?.name ?? '')}
        </span>
        <button type="button" onClick={() => onCardClick?.(issue.key)} className="text-xs text-[#0052CC] dark:text-blue-400 font-medium hover:underline">
          {issue.key}
        </button>
        <a href={`https://task.ascvn.com.vn/browse/${issue.key}`} target="_blank" rel="noopener noreferrer"
          className="ml-auto opacity-0 group-hover:opacity-100 text-[#5E6C84] hover:text-[#0052CC] transition-opacity" title="Open in Jira" onClick={e => e.stopPropagation()}>
          <ExternalLink size={12} />
        </a>
      </div>

      {/* Row 2: Summary — prominent */}
      <button type="button" onClick={() => onCardClick?.(issue.key)} className="w-full text-left mb-2">
        <p className="text-sm text-[#172B4D] dark:text-gray-200 leading-snug line-clamp-2 hover:text-[#0052CC] dark:hover:text-blue-400 transition-colors">
          {issue.fields.summary}
        </p>
      </button>

      {/* Row 3: Time tracking bar */}
      {hasTimeTracking && (
        <div className="mb-2">
          <div className="flex items-center justify-between text-[10px] mb-0.5">
            <span className="text-[#5E6C84] dark:text-gray-400">
              ⏱ {formatHours(logged)} / {formatHours(estimated)}
            </span>
            <span className="text-[#8993A4] dark:text-gray-500">{Math.round(progress * 100)}%</span>
          </div>
          <div className="w-full h-1 bg-[#DFE1E6] dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all', progress >= 1 ? 'bg-[#36B37E]' : 'bg-[#0052CC]')}
              style={{ width: `${Math.min(progress * 100, 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Row 4: Sprint + Created date */}
      {(sprintName || issue.fields.created) && (
        <div className="flex items-center gap-3 text-[10px] text-[#5E6C84] dark:text-gray-400 mb-2">
          {sprintName && <span>📅 {sprintName}</span>}
          {issue.fields.created && <span>🕐 {formatDate(issue.fields.created)}</span>}
        </div>
      )}

      {/* Row 5: Labels + Components (only when has tags or popover open) */}
      {(hasTags || openPopover === 'labels') && (
      <div className="relative mb-2">
        <button type="button" className="w-full text-left cursor-pointer" onClick={(e) => handleTogglePopover('labels', e)} onPointerDown={e => e.stopPropagation()}>
          {hasTags && (
            <div className="flex items-center gap-1 flex-wrap">
              {components.map(c => (
                <span key={c.id} className="text-[10px] px-1.5 py-0.5 rounded-sm bg-[#DFE1E6] dark:bg-gray-700 text-[#5E6C84] dark:text-gray-400">{c.name}</span>
              ))}
              {displayLabels.map(label => (
                <span key={label} className="text-[10px] font-medium px-1.5 py-0.5 rounded-sm text-white" style={{ backgroundColor: labelColor(label) }}>{label}</span>
              ))}
            </div>
          )}
        </button>
        {openPopover === 'labels' && (
          <div ref={popoverRef} className={cn(POPOVER_BASE, 'w-56')} onPointerDown={e => e.stopPropagation()} onClick={e => e.stopPropagation()}>
            {displayLabels.length > 0 && (
              <div className="p-2 space-y-1 border-b border-[#DFE1E6] dark:border-gray-600">
                {displayLabels.map(label => (
                  <div key={label} className="flex items-center justify-between px-2 py-0.5 text-[10px] font-medium rounded-sm text-white" style={{ backgroundColor: labelColor(label) }}>
                    <span>{label}</span>
                    <button type="button" onClick={() => handleRemoveLabel(label)} disabled={labelSubmitting} className="ml-1 opacity-70 hover:opacity-100"><X size={10} /></button>
                  </div>
                ))}
              </div>
            )}
            <div className="p-2">
              <input type="text" value={labelInput} onChange={e => setLabelInput(e.target.value)} onKeyDown={handleLabelKeyDown}
                placeholder="Type label + Enter" disabled={labelSubmitting} autoFocus
                className="w-full text-xs border border-[#DFE1E6] dark:border-gray-600 rounded px-2 py-1.5 bg-white dark:bg-gray-800 text-[#172B4D] dark:text-gray-100 placeholder:text-[#8993A4] focus:outline-none focus:border-[#0052CC]" />
            </div>
          </div>
        )}
      </div>
      )}

      {/* Row 6: Footer */}
      <div className="flex items-center gap-2">
        <div className="relative">
          <button type="button" onClick={e => handleTogglePopover('priority', e)} onPointerDown={e => e.stopPropagation()} className="flex-shrink-0 cursor-pointer" title={displayPriority?.name ?? 'No priority'}>
            <PriorityIcon priority={displayPriority} />
          </button>
          {openPopover === 'priority' && (
            <div ref={popoverRef} className={cn(POPOVER_BASE, 'w-36')} onPointerDown={e => e.stopPropagation()} onClick={e => e.stopPropagation()}>
              {PRIORITY_OPTIONS.map(p => (
                <button key={p.name} type="button" onClick={() => handlePriorityChange({ name: p.name, iconUrl: '' })}
                  className={cn(POPOVER_ITEM, displayPriority?.name === p.name && 'bg-[#F4F5F7] dark:bg-gray-700 font-semibold')}>
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
                  <span>{p.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {storyPoints != null && (
          <span className="text-[10px] font-medium text-[#0052CC] dark:text-blue-400">
            ⭐ {storyPoints} {storyPoints === 1 ? 'pt' : 'pts'}
          </span>
        )}

        {estimated > 0 && (
          <span className="text-[10px] text-[#5E6C84] dark:text-gray-400 flex-shrink-0">est {formatHours(estimated)}</span>
        )}
        {logged > 0 && (
          <span className="text-[10px] text-[#36B37E] dark:text-green-400 flex-shrink-0">log {formatHours(logged)}</span>
        )}

        <span className="text-[10px] text-[#5E6C84] dark:text-gray-400 truncate flex-1">
          {issue.fields.project?.name}
        </span>

        {/* Reporter: avatar + name */}
        <div className="flex items-center gap-1 flex-shrink-0" title={`Reporter: ${issue.fields.reporter?.displayName}`}>
          {issue.fields.reporter?.avatarUrls?.['24x24'] ? (
            <img src={issue.fields.reporter.avatarUrls['24x24']} alt="" className="w-4 h-4 rounded-full" />
          ) : (
            <span className="w-4 h-4 rounded-full bg-[#DFE1E6] dark:bg-gray-600 flex items-center justify-center text-[7px] text-[#5E6C84]">
              {issue.fields.reporter?.displayName?.charAt(0) ?? '?'}
            </span>
          )}
          <span className="text-[9px] text-[#8993A4] dark:text-gray-500">
            {issue.fields.reporter?.displayName}
          </span>
        </div>

        <span className="text-[#DFE1E6] dark:text-gray-600 select-none">·</span>

        {/* Assignee: avatar + name (clickable to edit) */}
        <div className="relative flex-shrink-0">
          <button type="button" onClick={e => handleTogglePopover('assignee', e)} onPointerDown={e => e.stopPropagation()} className="flex items-center gap-1 cursor-pointer hover:opacity-80 transition-opacity">
            {displayAssignee ? (
              <img src={displayAssignee.avatarUrls['24x24']} alt="" className="w-4 h-4 rounded-full border border-[#DFE1E6] dark:border-gray-600" />
            ) : (
              <span className="w-4 h-4 rounded-full bg-[#DFE1E6] dark:bg-gray-700 flex items-center justify-center text-[7px] text-[#5E6C84]">?</span>
            )}
            <span className="text-[9px] text-[#5E6C84] dark:text-gray-400">
              {displayAssignee?.displayName ?? 'Unassigned'}
            </span>
          </button>
          {openPopover === 'assignee' && (
            <div ref={popoverRef} className={cn(POPOVER_BASE, 'w-60')} onPointerDown={e => e.stopPropagation()} onClick={e => e.stopPropagation()}>
              <button type="button" onClick={() => handleAssign(null)} className={cn(POPOVER_ITEM, !displayAssignee && 'bg-[#F4F5F7] dark:bg-gray-700 font-semibold')}>
                <div className="w-5 h-5 rounded-full bg-[#DFE1E6] dark:bg-gray-600 flex items-center justify-center text-[10px]">?</div>
                <span>Unassigned</span>
              </button>
              <div className="border-t border-[#DFE1E6] dark:border-gray-600 my-0.5" />
              <div className="px-2 py-1">
                <div className="relative">
                  <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-[#5E6C84] dark:text-gray-500 pointer-events-none" />
                  <input type="text" value={userQuery} onChange={e => setUserQuery(e.target.value)} placeholder="Search users..." autoFocus
                    className="w-full text-xs border border-[#DFE1E6] dark:border-gray-600 rounded pl-7 pr-2 py-1.5 bg-white dark:bg-gray-800 text-[#172B4D] dark:text-gray-100 placeholder:text-[#8993A4] focus:outline-none focus:border-[#0052CC]" />
                </div>
              </div>
              <div className="max-h-48 overflow-y-auto">
                {userSearching && <div className="flex items-center gap-2 px-3 py-2 text-xs text-[#5E6C84] dark:text-gray-400"><Loader2 size={12} className="animate-spin" /> Searching...</div>}
                {!userSearching && userResults.map(user => (
                  <button key={user.name} type="button" onClick={() => handleAssign(user)}
                    className={cn(POPOVER_ITEM, displayAssignee?.name === user.name && 'bg-[#F4F5F7] dark:bg-gray-700 font-semibold')}>
                    <img src={user.avatarUrls['24x24']} alt="" className="w-5 h-5 rounded-full flex-shrink-0" />
                    <span>{user.displayName}</span>
                    {displayAssignee?.name === user.name && <span className="ml-auto text-[10px] text-[#8993A4]">current</span>}
                  </button>
                ))}
                {!userSearching && userQuery.length >= 1 && userResults.length === 0 && <div className="px-3 py-2 text-xs text-[#5E6C84] dark:text-gray-400">No users found</div>}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
