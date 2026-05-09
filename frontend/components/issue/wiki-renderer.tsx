import { jiraWikiToHtml } from '@/lib/jira-wiki';
import type { JiraAttachment } from '@/types/jira';

interface WikiRendererProps {
  content: string | null;
  attachments?: JiraAttachment[];
}

export function WikiRenderer({ content, attachments }: WikiRendererProps) {
  if (!content) {
    return (
      <p className="text-[#5E6C84] text-sm italic">No description provided.</p>
    );
  }

  return (
    <div
      className="text-sm text-[#172B4D] leading-relaxed"
      dangerouslySetInnerHTML={{ __html: jiraWikiToHtml(content, attachments) }}
    />
  );
}
