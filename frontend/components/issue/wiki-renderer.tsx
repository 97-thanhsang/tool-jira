import { jiraWikiToHtml } from '@/lib/jira-wiki';

interface WikiRendererProps {
  content: string | null;
}

export function WikiRenderer({ content }: WikiRendererProps) {
  if (!content) {
    return (
      <p className="text-[#5E6C84] text-sm italic">No description provided.</p>
    );
  }

  return (
    <div
      className="text-sm text-[#172B4D] leading-relaxed"
      dangerouslySetInnerHTML={{ __html: jiraWikiToHtml(content) }}
    />
  );
}
