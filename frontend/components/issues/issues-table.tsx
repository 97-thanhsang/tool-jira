'use client';

import { useState } from 'react';
import type { JiraIssue } from '@/types/jira';
import { IssueRow } from './issue-row';
import { Skeleton } from '@/components/ui/skeleton';

type StatusFilter = 'all' | 'new' | 'indeterminate' | 'done';
type PriorityFilter = 'all' | 'Highest' | 'High' | 'Medium' | 'Low' | 'Lowest';

interface IssuesTableProps {
  issues: JiraIssue[];
  isLoading: boolean;
}

const selectClass =
  'text-xs border border-[#DFE1E6] rounded px-2 py-1 bg-white text-[#172B4D] focus:outline-none focus:border-[#0052CC]';

export function IssuesTable({ issues, isLoading }: IssuesTableProps) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all');
  const [projectFilter, setProjectFilter] = useState<string>('all');

  // Derive unique projects from issues
  const projects = Array.from(
    new Map(
      issues.map((i) => [i.fields.project.key, i.fields.project.name])
    ).entries()
  );

  const filtered = issues.filter((issue) => {
    if (
      statusFilter !== 'all' &&
      issue.fields.status.statusCategory.key !== statusFilter
    )
      return false;
    if (
      priorityFilter !== 'all' &&
      issue.fields.priority.name !== priorityFilter
    )
      return false;
    if (
      projectFilter !== 'all' &&
      issue.fields.project.key !== projectFilter
    )
      return false;
    return true;
  });

  if (isLoading) {
    return (
      <div className="space-y-2 mt-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  const hasActiveFilter =
    statusFilter !== 'all' ||
    priorityFilter !== 'all' ||
    projectFilter !== 'all';

  return (
    <div>
      {/* Filter bar */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-1.5">
          <label className="text-xs text-[#5E6C84]">Status:</label>
          <select
            className={selectClass}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          >
            <option value="all">All</option>
            <option value="new">To Do</option>
            <option value="indeterminate">In Progress</option>
            <option value="done">Done</option>
          </select>
        </div>

        <div className="flex items-center gap-1.5">
          <label className="text-xs text-[#5E6C84]">Priority:</label>
          <select
            className={selectClass}
            value={priorityFilter}
            onChange={(e) =>
              setPriorityFilter(e.target.value as PriorityFilter)
            }
          >
            <option value="all">All</option>
            <option value="Highest">Highest</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
            <option value="Lowest">Lowest</option>
          </select>
        </div>

        {projects.length > 0 && (
          <div className="flex items-center gap-1.5">
            <label className="text-xs text-[#5E6C84]">Project:</label>
            <select
              className={selectClass}
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
            >
              <option value="all">All</option>
              {projects.map(([key, name]) => (
                <option key={key} value={key}>
                  {name}
                </option>
              ))}
            </select>
          </div>
        )}

        {hasActiveFilter && (
          <button
            onClick={() => {
              setStatusFilter('all');
              setPriorityFilter('all');
              setProjectFilter('all');
            }}
            className="text-xs text-[#0052CC] hover:underline"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-sm border border-[#DFE1E6] overflow-hidden">
        {/* Header row */}
        <div className="flex items-center gap-3 px-4 py-2 bg-[#F4F5F7] border-b border-[#DFE1E6]">
          <span className="text-xs font-semibold text-[#5E6C84] uppercase tracking-wide w-28">
            Key
          </span>
          <span className="flex-1 text-xs font-semibold text-[#5E6C84] uppercase tracking-wide">
            Summary
          </span>
          <span className="text-xs font-semibold text-[#5E6C84] uppercase tracking-wide w-28">
            Status
          </span>
          <span className="text-xs font-semibold text-[#5E6C84] uppercase tracking-wide w-24">
            Priority
          </span>
          <span className="text-xs font-semibold text-[#5E6C84] uppercase tracking-wide w-28">
            Project
          </span>
          <span className="text-xs font-semibold text-[#5E6C84] uppercase tracking-wide w-20 text-right">
            Updated
          </span>
        </div>

        {filtered.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-sm text-[#5E6C84]">
            No issues found
          </div>
        ) : (
          filtered.map((issue) => <IssueRow key={issue.id} issue={issue} />)
        )}
      </div>

      {hasActiveFilter && (
        <p className="text-xs text-[#5E6C84] mt-2 text-right">
          Showing {filtered.length} of {issues.length} issues
        </p>
      )}
    </div>
  );
}
