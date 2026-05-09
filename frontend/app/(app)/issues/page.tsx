'use client';

import { useState, useEffect } from 'react';
import { useIssuesList } from '@/hooks/use-issues-list';
import type { IssueFilters } from '@/hooks/use-issues-list';
import { IssuesTable } from '@/components/issues/issues-table';
import { FilterPanel } from '@/components/issues/filter-panel';
import { WorklogsTab } from '@/components/issues/worklogs-tab';
import { cn } from '@/lib/utils';

type Tab = 'issues' | 'worklogs';

const PAGE_SIZE = 25;

export default function IssuesPage() {
  const [activeTab, setActiveTab] = useState<Tab>('issues');
  const [filters, setFilters] = useState<IssueFilters>({});
  const [page, setPage] = useState(0);

  const { issues, total, isLoading, error, mutate } = useIssuesList({
    ...filters,
    startAt: page * PAGE_SIZE,
  });

  // Listen for bulk transition events → mutate
  useEffect(() => {
    const handler = () => { mutate(); };
    window.addEventListener('issues-bulk-transitioned', handler);
    return () => window.removeEventListener('issues-bulk-transitioned', handler);
  }, [mutate]);

  function updateFilters(newFilters: Partial<IssueFilters>) {
    setFilters((prev) => ({ ...prev, ...newFilters }));
    setPage(0);
  }

  function clearFilters() {
    setFilters({});
    setPage(0);
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <h1 className="text-xl font-semibold text-[#172B4D] dark:text-gray-100">
          Issues
        </h1>
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
            {tab === 'issues' ? 'Issues' : 'Worklog History'}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'issues' ? (
        error ? (
          <div className="flex items-center justify-center py-16">
            <p className="text-sm text-red-600">
              Failed to load issues. Please try again.
            </p>
          </div>
        ) : (
          <>
            <FilterPanel
              filters={filters}
              onUpdate={updateFilters}
              onClear={clearFilters}
            />
            <IssuesTable
              issues={issues}
              total={total}
              isLoading={isLoading}
              page={page}
              pageSize={PAGE_SIZE}
              onPageChange={setPage}
            />
          </>
        )
      ) : (
        <WorklogsTab />
      )}
    </div>
  );
}
