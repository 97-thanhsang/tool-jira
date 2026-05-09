import Link from 'next/link';
import type { JiraIssue } from '@/types/jira';
import { StatusBadge } from '@/components/shared/status-badge';
import { PriorityIcon } from '@/components/shared/priority-icon';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

interface IssueRowProps {
  issue: JiraIssue;
}

export function IssueRow({ issue }: IssueRowProps) {
  const f = issue.fields;

  return (
    <Link
      href={`/issues/${issue.key}`}
      className="flex items-center gap-3 px-4 py-3 hover:bg-[#F4F5F7] transition-colors border-b border-[#DFE1E6] last:border-b-0"
    >
      <span className="text-xs text-[#0052CC] font-medium w-28 flex-shrink-0 truncate">
        {issue.key}
      </span>
      <span className="flex-1 text-sm text-[#172B4D] truncate min-w-0">
        {f.summary}
      </span>
      <div className="flex-shrink-0 w-28">
        <StatusBadge status={f.status} />
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0 w-24">
        <PriorityIcon priority={f.priority} />
        <span className="text-xs text-[#5E6C84] truncate">{f.priority.name}</span>
      </div>
      <span className="text-xs text-[#5E6C84] flex-shrink-0 w-28 truncate">
        {f.project.name}
      </span>
      <span className="text-xs text-[#5E6C84] flex-shrink-0 w-20 text-right">
        {formatDate(f.updated)}
      </span>
    </Link>
  );
}
