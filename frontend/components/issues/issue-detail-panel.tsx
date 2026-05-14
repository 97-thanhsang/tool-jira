'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { api } from '@/lib/api';
import type { JiraIssue, JiraTransition, JiraComment } from '@/types/jira';
import { StatusBadge } from '@/components/shared/status-badge';
import { PriorityIcon } from '@/components/shared/priority-icon';
import {
  X, ExternalLink, Edit2, Check, Loader2,
  MessageSquare, ChevronDown, AlertTriangle, Send,
  Calendar, Tag, User, Clock, Activity,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── helpers ─────────────────────────────────────────────────────

function fmtDate(iso: string | null | undefined) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function isOverdue(duedate: string) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return new Date(duedate) < today;
}

const PRIORITY_OPTIONS = ['Highest', 'High', 'Medium', 'Low', 'Lowest', 'Blocker', 'Minor'];

// ─── small UI bits ────────────────────────────────────────────────

function Avatar({ user }: { user: { displayName: string; avatarUrls: { '24x24': string; '48x48': string } } }) {
  return user.avatarUrls['24x24']
    ? <Image src={user.avatarUrls['24x24']} alt={user.displayName} width={20} height={20} className="rounded-full flex-shrink-0" unoptimized />
    : <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#0052CC] text-white text-[9px] font-bold flex-shrink-0">{user.displayName.charAt(0)}</span>;
}

function FieldRow({ icon, label, children }: { icon?: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 min-h-[28px]">
      <div className="flex items-center gap-1.5 w-28 flex-shrink-0 mt-0.5">
        {icon && <span className="text-[#5E6C84]">{icon}</span>}
        <span className="text-xs font-medium text-[#5E6C84] dark:text-gray-400">{label}</span>
      </div>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

// ─── inline edit widgets ──────────────────────────────────────────

interface EditSelectProps {
  value: string;
  options: { value: string; label: string }[];
  onSave: (v: string) => void;
  onCancel: () => void;
  loading?: boolean;
}

function EditSelect({ value, options, onSave, onCancel, loading }: EditSelectProps) {
  return (
    <div className="flex items-center gap-1.5">
      <select
        autoFocus
        defaultValue={value}
        onChange={e => onSave(e.target.value)}
        onBlur={() => onCancel()}
        disabled={loading}
        className="text-xs border border-[#0052CC] rounded px-2 py-1 bg-white dark:bg-gray-800 text-[#172B4D] dark:text-gray-100 focus:outline-none"
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {loading && <Loader2 size={12} className="animate-spin text-[#0052CC]" />}
    </div>
  );
}

interface EditTextProps {
  value: string;
  onSave: (v: string) => void;
  onCancel: () => void;
  loading?: boolean;
  multiline?: boolean;
  placeholder?: string;
}

function EditText({ value, onSave, onCancel, loading, multiline, placeholder }: EditTextProps) {
  const [draft, setDraft] = useState(value);
  const Tag = multiline ? 'textarea' : 'input';

  function commit() { if (draft.trim() !== value) onSave(draft.trim()); else onCancel(); }

  return (
    <div className="flex items-start gap-1.5 w-full">
      <Tag
        autoFocus
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onKeyDown={e => {
          if (!multiline && e.key === 'Enter') { e.preventDefault(); commit(); }
          if (e.key === 'Escape') onCancel();
        }}
        placeholder={placeholder}
        disabled={loading}
        rows={multiline ? 3 : undefined}
        className={cn(
          'flex-1 text-xs border border-[#0052CC] rounded px-2 py-1 bg-white dark:bg-gray-800 text-[#172B4D] dark:text-gray-100 focus:outline-none resize-none',
          multiline && 'min-h-[60px]',
        )}
      />
      <div className="flex flex-col gap-1 mt-0.5">
        <button
          onMouseDown={e => { e.preventDefault(); commit(); }}
          disabled={loading}
          className="p-1 rounded bg-[#0052CC] text-white hover:bg-[#0747A6] disabled:opacity-50 transition-colors"
        >
          {loading ? <Loader2 size={10} className="animate-spin" /> : <Check size={10} />}
        </button>
        <button
          onMouseDown={e => { e.preventDefault(); onCancel(); }}
          className="p-1 rounded border border-[#DFE1E6] text-[#5E6C84] hover:border-red-400 hover:text-red-500 transition-colors"
        >
          <X size={10} />
        </button>
      </div>
    </div>
  );
}

interface EditDateProps {
  value: string | undefined;
  onSave: (v: string | null) => void;
  onCancel: () => void;
  loading?: boolean;
}

function EditDate({ value, onSave, onCancel, loading }: EditDateProps) {
  const [draft, setDraft] = useState(value ?? '');
  return (
    <div className="flex items-center gap-1.5">
      <input
        autoFocus
        type="date"
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') onSave(draft || null);
          if (e.key === 'Escape') onCancel();
        }}
        disabled={loading}
        className="text-xs border border-[#0052CC] rounded px-2 py-1 bg-white dark:bg-gray-800 text-[#172B4D] dark:text-gray-100 focus:outline-none"
      />
      <button
        onMouseDown={() => onSave(draft || null)}
        disabled={loading}
        className="p-1 rounded bg-[#0052CC] text-white hover:bg-[#0747A6] disabled:opacity-50"
      >
        {loading ? <Loader2 size={10} className="animate-spin" /> : <Check size={10} />}
      </button>
      <button onMouseDown={onCancel} className="p-1 rounded border border-[#DFE1E6] text-[#5E6C84] hover:text-red-500">
        <X size={10} />
      </button>
    </div>
  );
}

// ─── transition picker ────────────────────────────────────────────

function TransitionPicker({ issueKey, currentStatus, transitions, onDone, onCancel }: {
  issueKey: string;
  currentStatus: string;
  transitions: JiraTransition[];
  onDone: () => void;
  onCancel: () => void;
}) {
  const [applying, setApplying] = useState<string | null>(null);

  async function apply(t: JiraTransition) {
    setApplying(t.id);
    try {
      await api.post(`/issue/${issueKey}/transitions`, { transition: { id: t.id } });
      onDone();
    } catch {
      setApplying(null);
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 border border-[#DFE1E6] dark:border-gray-600 rounded shadow-md z-40 min-w-[160px] py-1">
      <div className="px-3 py-1.5 text-[10px] text-[#5E6C84] font-semibold uppercase border-b border-[#DFE1E6] dark:border-gray-700">
        Transition from {currentStatus}
      </div>
      {transitions.map(t => (
        <button
          key={t.id}
          onClick={() => apply(t)}
          disabled={applying !== null}
          className="w-full flex items-center gap-2 text-left text-xs px-3 py-2 hover:bg-[#F4F5F7] dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
        >
          {applying === t.id ? <Loader2 size={12} className="animate-spin" /> : <ChevronDown size={12} className="text-[#5E6C84]" />}
          {t.name}
        </button>
      ))}
      <div className="border-t border-[#DFE1E6] dark:border-gray-700 mt-1 pt-1">
        <button
          onClick={onCancel}
          className="w-full text-left text-xs px-3 py-1.5 text-[#5E6C84] hover:text-[#172B4D] transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─── comment card ─────────────────────────────────────────────────

function CommentCard({ comment }: { comment: JiraComment }) {
  return (
    <div className="flex gap-2.5">
      {comment.author.avatarUrls?.['24x24']
        ? <Image src={comment.author.avatarUrls['24x24']} alt={comment.author.displayName} width={24} height={24} className="rounded-full flex-shrink-0 mt-0.5" unoptimized />
        : <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#0052CC] text-white text-[9px] font-bold flex-shrink-0 mt-0.5">{comment.author.displayName.charAt(0)}</span>
      }
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-xs font-semibold text-[#172B4D] dark:text-gray-100">{comment.author.displayName}</span>
          <span className="text-[10px] text-[#5E6C84] dark:text-gray-500">{fmtDateTime(comment.created)}</span>
        </div>
        <p className="text-xs text-[#42526E] dark:text-gray-300 whitespace-pre-wrap break-words leading-relaxed">{comment.body}</p>
      </div>
    </div>
  );
}

// ─── Main panel ───────────────────────────────────────────────────

interface IssueDetailPanelProps {
  issueKey: string | null;
  onClose: () => void;
  onUpdated: () => void;
}

type EditingField =
  | 'summary' | 'status' | 'priority' | 'assignee'
  | 'duedate' | 'labels' | null;

const FIELDS_TO_FETCH = [
  'summary', 'description', 'status', 'priority', 'issuetype',
  'assignee', 'reporter', 'project', 'created', 'updated',
  'duedate', 'labels', 'comment', 'timetracking', 'sprint',
  'fixVersions', 'components', 'subtasks', 'parent',
].join(',');

export function IssueDetailPanel({ issueKey, onClose, onUpdated }: IssueDetailPanelProps) {
  const [issue, setIssue]             = useState<JiraIssue | null>(null);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [editingField, setEditingField] = useState<EditingField>(null);
  const [fieldSaving, setFieldSaving] = useState(false);
  const [transitions, setTransitions] = useState<JiraTransition[]>([]);
  const [showTransitions, setShowTransitions] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [commentSaving, setCommentSaving] = useState(false);
  const [saveToast, setSaveToast]     = useState<'success' | 'error' | null>(null);

  const panelRef = useRef<HTMLDivElement>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch issue
  const fetchIssue = useCallback(async () => {
    if (!issueKey) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<JiraIssue>(`/issue/${issueKey}?fields=${FIELDS_TO_FETCH}`);
      setIssue(res.data);
    } catch {
      setError('Failed to load issue');
    } finally {
      setLoading(false);
    }
  }, [issueKey]);

  useEffect(() => { fetchIssue(); }, [fetchIssue]);

  // Fetch transitions for status edit
  useEffect(() => {
    if (!issueKey || !showTransitions) return;
    api.get<{ transitions: JiraTransition[] }>(`/issue/${issueKey}/transitions`)
      .then(r => setTransitions(r.data.transitions ?? []))
      .catch(() => setTransitions([]));
  }, [issueKey, showTransitions]);

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { setEditingField(null); setShowTransitions(false); }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  function showToast(type: 'success' | 'error') {
    setSaveToast(type);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setSaveToast(null), 2500);
  }

  // Generic field save via PUT /issue/{key}
  async function saveField(fields: Record<string, unknown>) {
    if (!issueKey) return;
    setFieldSaving(true);
    try {
      await api.put(`/issue/${issueKey}`, { fields });
      await fetchIssue();
      setEditingField(null);
      showToast('success');
      onUpdated();
    } catch {
      showToast('error');
    } finally {
      setFieldSaving(false);
    }
  }

  // Add comment
  async function addComment() {
    if (!issueKey || !commentText.trim()) return;
    setCommentSaving(true);
    try {
      await api.post(`/issue/${issueKey}/comment`, { body: commentText.trim() });
      setCommentText('');
      await fetchIssue();
    } catch {
      showToast('error');
    } finally {
      setCommentSaving(false);
    }
  }

  if (!issueKey) return null;

  const f = issue?.fields;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 dark:bg-black/40 z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className="fixed right-0 top-0 h-full w-[480px] max-w-full bg-white dark:bg-gray-900 shadow-2xl z-50 flex flex-col"
        style={{ animation: 'slideInRight 0.2s ease-out' }}
      >
        {/* ── Header ── */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-[#DFE1E6] dark:border-gray-700 flex-shrink-0">
          {issue && (
            <>
              <span className="text-xs font-mono font-semibold text-[#0052CC] dark:text-blue-400 bg-[#E6F0FF] dark:bg-blue-900/30 px-2 py-0.5 rounded">
                {issue.key}
              </span>
              <a
                href={`/issues/${issue.key}`}
                className="text-[#5E6C84] hover:text-[#0052CC] transition-colors"
                title="Open full issue page"
              >
                <ExternalLink size={13} />
              </a>
            </>
          )}
          <button
            onClick={onClose}
            className="ml-auto text-[#5E6C84] hover:text-[#172B4D] dark:hover:text-gray-200 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={24} className="animate-spin text-[#0052CC]" />
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center justify-center py-20 gap-2 text-red-500">
              <AlertTriangle size={20} />
              <p className="text-sm">{error}</p>
              <button onClick={fetchIssue} className="text-xs text-[#0052CC] hover:underline">Retry</button>
            </div>
          )}

          {!loading && !error && issue && f && (
            <div className="p-4 space-y-5">

              {/* Summary */}
              <div>
                {editingField === 'summary' ? (
                  <EditText
                    value={f.summary}
                    onSave={v => saveField({ summary: v })}
                    onCancel={() => setEditingField(null)}
                    loading={fieldSaving}
                    placeholder="Issue summary"
                  />
                ) : (
                  <div className="group flex items-start gap-2">
                    <h2 className="text-base font-semibold text-[#172B4D] dark:text-gray-100 leading-snug flex-1">
                      {f.summary}
                    </h2>
                    <button
                      onClick={() => setEditingField('summary')}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-[#F4F5F7] dark:hover:bg-gray-700 text-[#5E6C84] flex-shrink-0 transition-all"
                      title="Edit summary"
                    >
                      <Edit2 size={12} />
                    </button>
                  </div>
                )}
              </div>

              {/* Details card */}
              <div className="bg-[#F4F5F7] dark:bg-gray-800 rounded p-3 space-y-2.5">

                {/* Type */}
                <FieldRow icon={<Activity size={13} />} label="Type">
                  <div className="flex items-center gap-1.5">
                    {f.issuetype.iconUrl
                      ? <Image src={f.issuetype.iconUrl} alt={f.issuetype.name} width={14} height={14} unoptimized />
                      : null}
                    <span className="text-xs text-[#172B4D] dark:text-gray-200">{f.issuetype.name}</span>
                  </div>
                </FieldRow>

                {/* Status */}
                <FieldRow icon={<Activity size={13} />} label="Status">
                  <div className="relative">
                    {showTransitions ? (
                      <div className="absolute left-0 top-0 z-50">
                        <TransitionPicker
                          issueKey={issue.key}
                          currentStatus={f.status.name}
                          transitions={transitions}
                          onDone={() => { setShowTransitions(false); fetchIssue(); onUpdated(); }}
                          onCancel={() => setShowTransitions(false)}
                        />
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowTransitions(true)}
                        className="group flex items-center gap-1.5 hover:opacity-80 transition-opacity"
                        title="Change status"
                      >
                        <StatusBadge status={f.status} />
                        <ChevronDown size={11} className="text-[#5E6C84] opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    )}
                  </div>
                </FieldRow>

                {/* Priority */}
                <FieldRow icon={<Activity size={13} />} label="Priority">
                  {editingField === 'priority' ? (
                    <EditSelect
                      value={f.priority?.name ?? 'Medium'}
                      options={PRIORITY_OPTIONS.map(p => ({ value: p, label: p }))}
                      onSave={v => saveField({ priority: { name: v } })}
                      onCancel={() => setEditingField(null)}
                      loading={fieldSaving}
                    />
                  ) : (
                    <div className="group flex items-center gap-1.5">
                      <PriorityIcon priority={f.priority} />
                      <span className="text-xs text-[#5E6C84] dark:text-gray-400">{f.priority?.name ?? '—'}</span>
                      <button
                        onClick={() => setEditingField('priority')}
                        className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-[#E0E0E0] dark:hover:bg-gray-600 text-[#5E6C84]"
                      >
                        <Edit2 size={10} />
                      </button>
                    </div>
                  )}
                </FieldRow>

                {/* Assignee */}
                <FieldRow icon={<User size={13} />} label="Assignee">
                  {editingField === 'assignee' ? (
                    <EditText
                      value={f.assignee?.name ?? ''}
                      onSave={v => saveField({ assignee: { name: v } })}
                      onCancel={() => setEditingField(null)}
                      loading={fieldSaving}
                      placeholder="Username (leave blank to unassign)"
                    />
                  ) : (
                    <div className="group flex items-center gap-1.5">
                      {f.assignee ? (
                        <>
                          <Avatar user={f.assignee} />
                          <span className="text-xs text-[#172B4D] dark:text-gray-200">{f.assignee.displayName}</span>
                        </>
                      ) : (
                        <span className="text-xs text-[#5E6C84] dark:text-gray-500 italic">Unassigned</span>
                      )}
                      <button
                        onClick={() => setEditingField('assignee')}
                        className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-[#E0E0E0] dark:hover:bg-gray-600 text-[#5E6C84]"
                      >
                        <Edit2 size={10} />
                      </button>
                    </div>
                  )}
                </FieldRow>

                {/* Reporter */}
                <FieldRow icon={<User size={13} />} label="Reporter">
                  <div className="flex items-center gap-1.5">
                    <Avatar user={f.reporter} />
                    <span className="text-xs text-[#172B4D] dark:text-gray-200">{f.reporter.displayName}</span>
                  </div>
                </FieldRow>

                {/* Due date */}
                <FieldRow icon={<Calendar size={13} />} label="Due date">
                  {editingField === 'duedate' ? (
                    <EditDate
                      value={f.duedate}
                      onSave={v => saveField({ duedate: v })}
                      onCancel={() => setEditingField(null)}
                      loading={fieldSaving}
                    />
                  ) : (
                    <div className="group flex items-center gap-1.5">
                      <span className={cn(
                        'text-xs',
                        f.duedate
                          ? isOverdue(f.duedate)
                            ? 'text-red-500 dark:text-red-400 font-medium'
                            : 'text-[#172B4D] dark:text-gray-200'
                          : 'text-[#5E6C84] dark:text-gray-500 italic',
                      )}>
                        {f.duedate ? fmtDate(f.duedate) : 'None'}
                      </span>
                      <button
                        onClick={() => setEditingField('duedate')}
                        className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-[#E0E0E0] dark:hover:bg-gray-600 text-[#5E6C84]"
                      >
                        <Edit2 size={10} />
                      </button>
                    </div>
                  )}
                </FieldRow>

                {/* Labels */}
                <FieldRow icon={<Tag size={13} />} label="Labels">
                  {editingField === 'labels' ? (
                    <EditText
                      value={(f.labels ?? []).join(', ')}
                      onSave={v => saveField({ labels: v.split(',').map(s => s.trim()).filter(Boolean) })}
                      onCancel={() => setEditingField(null)}
                      loading={fieldSaving}
                      placeholder="label1, label2"
                    />
                  ) : (
                    <div className="group flex items-start gap-1.5 flex-wrap">
                      {(f.labels ?? []).length > 0
                        ? f.labels.map(l => (
                            <span key={l} className="text-[10px] px-1.5 py-0.5 bg-[#DFE1E6] dark:bg-gray-600 text-[#42526E] dark:text-gray-300 rounded">
                              {l}
                            </span>
                          ))
                        : <span className="text-xs text-[#5E6C84] dark:text-gray-500 italic">None</span>
                      }
                      <button
                        onClick={() => setEditingField('labels')}
                        className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-[#E0E0E0] dark:hover:bg-gray-600 text-[#5E6C84]"
                      >
                        <Edit2 size={10} />
                      </button>
                    </div>
                  )}
                </FieldRow>

                {/* Sprint */}
                {f.sprint && (
                  <FieldRow icon={<Activity size={13} />} label="Sprint">
                    <span className="text-xs text-[#172B4D] dark:text-gray-200">
                      {Array.isArray(f.sprint) ? f.sprint[f.sprint.length - 1]?.name : f.sprint.name}
                    </span>
                  </FieldRow>
                )}

                {/* Time tracking */}
                {f.timetracking && (
                  <FieldRow icon={<Clock size={13} />} label="Time">
                    <span className="text-xs text-[#5E6C84] dark:text-gray-400">
                      Est: {f.timetracking.originalEstimate ?? '—'}
                      {f.timetracking.timeSpent ? ` · Logged: ${f.timetracking.timeSpent}` : ''}
                      {f.timetracking.remainingEstimate ? ` · Left: ${f.timetracking.remainingEstimate}` : ''}
                    </span>
                  </FieldRow>
                )}

                {/* Dates */}
                <FieldRow icon={<Calendar size={13} />} label="Created">
                  <span className="text-xs text-[#5E6C84] dark:text-gray-400">{fmtDateTime(f.created)}</span>
                </FieldRow>
                <FieldRow icon={<Calendar size={13} />} label="Updated">
                  <span className="text-xs text-[#5E6C84] dark:text-gray-400">{fmtDateTime(f.updated)}</span>
                </FieldRow>
              </div>

              {/* Description */}
              {f.description && (
                <div>
                  <h3 className="text-xs font-semibold text-[#5E6C84] dark:text-gray-400 uppercase tracking-wide mb-2">
                    Description
                  </h3>
                  <div className="text-sm text-[#42526E] dark:text-gray-300 whitespace-pre-wrap leading-relaxed bg-[#F4F5F7] dark:bg-gray-800 rounded p-3">
                    {f.description}
                  </div>
                </div>
              )}

              {/* Comments */}
              <div>
                <h3 className="text-xs font-semibold text-[#5E6C84] dark:text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                  <MessageSquare size={12} />
                  Comments {f.comment?.comments?.length ? `(${f.comment.comments.length})` : ''}
                </h3>

                {(f.comment?.comments ?? []).length > 0 && (
                  <div className="space-y-4 mb-4">
                    {f.comment!.comments.map(c => (
                      <CommentCard key={c.id} comment={c} />
                    ))}
                  </div>
                )}

                {/* Add comment */}
                <div className="flex gap-2">
                  <textarea
                    value={commentText}
                    onChange={e => setCommentText(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) addComment();
                    }}
                    placeholder="Add a comment… (Ctrl+Enter to submit)"
                    rows={3}
                    disabled={commentSaving}
                    className="flex-1 text-xs border border-[#DFE1E6] dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-800 text-[#172B4D] dark:text-gray-100 focus:outline-none focus:border-[#0052CC] placeholder-[#5E6C84] dark:placeholder-gray-500 resize-none"
                  />
                  <button
                    onClick={addComment}
                    disabled={!commentText.trim() || commentSaving}
                    className="self-end p-2 rounded bg-[#0052CC] text-white hover:bg-[#0747A6] disabled:opacity-40 transition-colors"
                    title="Submit comment (Ctrl+Enter)"
                  >
                    {commentSaving ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  </button>
                </div>
              </div>

            </div>
          )}
        </div>

        {/* ── Toast ── */}
        {saveToast && (
          <div className={cn(
            'absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 text-xs px-4 py-2 rounded-full shadow-lg text-white font-medium transition-all',
            saveToast === 'success' ? 'bg-green-500' : 'bg-red-500',
          )}>
            {saveToast === 'success' ? <Check size={13} /> : <AlertTriangle size={13} />}
            {saveToast === 'success' ? 'Saved' : 'Save failed — try again'}
          </div>
        )}
      </div>

      {/* Slide-in keyframe */}
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to   { transform: translateX(0); }
        }
      `}</style>
    </>
  );
}
