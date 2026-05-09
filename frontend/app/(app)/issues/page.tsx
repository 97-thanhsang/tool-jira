'use client';

import { useState } from 'react';
import { useIssuesList } from '@/hooks/use-issues-list';
import { IssuesTable } from '@/components/issues/issues-table';
import { WorklogsTab } from '@/components/issues/worklogs-tab';
import { cn } from '@/lib/utils';

type Tab = 'issues' | 'worklogs';

export default function IssuesPage() {
  const { issues, total, isLoading, error } = useIssuesList();
  const [activeTab, setActiveTab] = useState<Tab>('issues');

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <h1 className="text-xl font-semibold text-[#172B4D] dark:text-gray-100">My Issues</h1>
        {!isLoading && activeTab === 'issues' && (
          <span className="text-xs bg-[#DFE1E6] dark:bg-gray-700 text-[#42526E] dark:text-gray-300 px-2 py-0.5 rounded-full font-medium">
            {total}
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 border-b border-[#DFE1E6] dark:border-gray-700">
        {(['issues', 'worklogs'] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px capitalize',
              activeTab === tab
                ? 'border-[#0052CC] text-[#0052CC]'
                : 'border-transparent text-[#5E6C84] dark:text-gray-400 hover:text-[#172B4D] dark:hover:text-gray-200 hover:border-[#DFE1E6]'
            )}
          >
            {tab === 'issues' ? 'My Issues' : 'Worklog History'}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'issues' ? (
        error ? (
          <div className="flex items-center justify-center py-16">
            <p className="text-sm text-red-600">Failed to load issues. Please try again.</p>
          </div>
        ) : (
          <IssuesTable issues={issues} isLoading={isLoading} />
        )
      ) : (
        <WorklogsTab />
      )}
    </div>
  );
}
