import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import type { JiraIssue } from '@/types/jira';
import { PriorityIcon } from '@/components/shared/priority-icon';
import { Card } from '@/components/ui/card';

interface IssueCardProps {
  issue: JiraIssue;
}

const issueTypeColors: Record<string, string> = {
  Story:      'bg-[#36B37E] text-white',
  'Sub-task': 'bg-[#0052CC] text-white',
  Bug:        'bg-[#DE350B] text-white',
  Task:       'bg-[#4BADE8] text-white',
};

function issueTypeLabel(name: string): string {
  if (name === 'Sub-task') return 'SUB';
  if (name === 'Story') return 'STR';
  return name.slice(0, 3).toUpperCase();
}

export function IssueCard({ issue }: IssueCardProps) {
  const typeColor =
    issueTypeColors[issue.fields.issuetype.name] ?? 'bg-gray-400 text-white';

  return (
    <Card className="group relative p-3 bg-white border border-[#DFE1E6] rounded-sm hover:shadow-md transition-shadow">
      {/* Type badge + key + external link */}
      <div className="flex items-center gap-1.5 mb-2">
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-sm ${typeColor}`}>
          {issueTypeLabel(issue.fields.issuetype.name)}
        </span>
        <Link
          href={`/issues/${issue.key}`}
          className="text-xs text-[#0052CC] font-medium hover:underline"
        >
          {issue.key}
        </Link>
        <a
          href={`https://task.ascvn.com.vn/browse/${issue.key}`}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto opacity-0 group-hover:opacity-100 text-[#5E6C84] hover:text-[#0052CC] transition-opacity"
          title="Open in Jira"
        >
          <ExternalLink size={12} />
        </a>
      </div>

      {/* Summary */}
      <Link href={`/issues/${issue.key}`}>
        <p className="text-sm text-[#172B4D] leading-snug line-clamp-2 mb-2 hover:text-[#0052CC]">
          {issue.fields.summary}
        </p>
      </Link>

      {/* Footer: priority dot + project name */}
      <div className="flex items-center gap-2">
        <PriorityIcon priority={issue.fields.priority} />
        <span className="text-[10px] text-[#5E6C84] truncate flex-1">
          {issue.fields.project.name}
        </span>
      </div>
    </Card>
  );
}
