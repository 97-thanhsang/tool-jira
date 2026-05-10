'use client';
import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import type { JiraIssue } from '@/types/jira';
import { PriorityIcon } from '@/components/shared/priority-icon';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface IssueCardProps {
  issue: JiraIssue;
  /** Called when the user clicks the issue summary (opens Quick View) */
  onCardClick?: (key: string) => void;
}

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

/** Days since a given ISO date string. Returns null for future dates. */
function daysSince(dateStr: string): number | null {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  if (diff < 0) return null;
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

const LABEL_COLORS = [
  '#0052CC', '#36B37E', '#DE350B', '#FF8B00',
  '#6554C0', '#008DA6', '#E774BB', '#FF5630',
  '#00B8D9', '#8777D9',
];

/** Deterministic hash-based color for a label name. */
function labelColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return LABEL_COLORS[Math.abs(hash) % LABEL_COLORS.length];
}

export function IssueCard({ issue, onCardClick }: IssueCardProps) {
  const typeColor  = issueTypeColors[issue.fields.issuetype.name] ?? 'bg-gray-400 text-white';
  const dueDateStatus = getDueDateStatus(issue.fields.duedate);
  const daysOld = daysSince(issue.fields.updated);
  const labels = issue.fields.labels ?? [];
  const components = issue.fields.components ?? [];

  const hasTags = labels.length > 0 || components.length > 0;

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
          {issueTypeLabel(issue.fields.issuetype.name)}
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

      {/* Labels + Components chips */}
      {hasTags && (
        <div className="flex items-center gap-1 flex-wrap mb-2">
          {components.map((c) => (
            <span
              key={c.id}
              className="text-[10px] px-1.5 py-0.5 rounded-sm bg-[#DFE1E6] dark:bg-gray-700 text-[#5E6C84] dark:text-gray-400"
            >
              {c.name}
            </span>
          ))}
          {labels.map((label) => (
            <span
              key={label}
              className="text-[10px] font-medium px-1.5 py-0.5 rounded-sm text-white"
              style={{ backgroundColor: labelColor(label) }}
            >
              {label}
            </span>
          ))}
        </div>
      )}

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
        <PriorityIcon priority={issue.fields.priority} />
        <span className="text-[10px] text-[#5E6C84] dark:text-gray-400 truncate flex-1">
          {issue.fields.project.name}
        </span>

        {/* Days since updated */}
        {daysOld != null && (
          <span className="text-[10px] text-[#8993A4] dark:text-gray-500 flex-shrink-0">
            {daysOld}d
          </span>
        )}

        {/* Assignee avatar */}
        {issue.fields.assignee ? (
          <img
            src={issue.fields.assignee.avatarUrls['24x24']}
            alt={issue.fields.assignee.displayName}
            title={issue.fields.assignee.displayName}
            className="w-5 h-5 rounded-full flex-shrink-0 border border-[#DFE1E6] dark:border-gray-600"
          />
        ) : (
          <div
            className="w-5 h-5 rounded-full flex-shrink-0 bg-[#DFE1E6] dark:bg-gray-700 flex items-center justify-center text-[10px] text-[#5E6C84] dark:text-gray-400"
            title="Unassigned"
          >
            ?
          </div>
        )}
      </div>
    </Card>
  );
}
