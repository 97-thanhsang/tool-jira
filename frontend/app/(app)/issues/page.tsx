'use client';

import { useIssuesList } from '@/hooks/use-issues-list';
import { IssuesTable } from '@/components/issues/issues-table';

export default function IssuesPage() {
  const { issues, total, isLoading, error } = useIssuesList();

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-xl font-semibold text-[#172B4D]">My Issues</h1>
        {!isLoading && (
          <span className="text-xs bg-[#DFE1E6] text-[#42526E] px-2 py-0.5 rounded-full font-medium">
            {total}
          </span>
        )}
      </div>

      {error ? (
        <div className="flex items-center justify-center py-16">
          <p className="text-sm text-red-600">Failed to load issues. Please try again.</p>
        </div>
      ) : (
        <IssuesTable issues={issues} isLoading={isLoading} />
      )}
    </div>
  );
}
