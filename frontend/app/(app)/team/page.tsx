'use client';
import { useState, useEffect, useMemo } from 'react';
import { startOfWeek, addWeeks, startOfMonth, addMonths, format } from 'date-fns';
import { Users } from 'lucide-react';
import { getStoredUser } from '@/lib/api';
import { useTeamDashboard } from '@/hooks/use-team-dashboard';
import { TeamFilters, type TeamFiltersState } from '@/components/team/team-filters';
import { TeamReportTable } from '@/components/team/team-report-table';
import type { TeamGroup } from '@/types/jira';

// ─── Default groups ──────────────────────────────────────────────────────────

const defaultGroups: TeamGroup[] = [
  {
    id: 'rd1',
    name: 'R&D1',
    members: ['SangNT', 'TriHD', 'NghiaDT', 'ThinhTPQ', 'HieuDT', 'PhatNH'],
  },
  {
    id: 'frontend',
    name: 'Team Frontend',
    members: ['SangNT', 'PhatNH', 'HuyNQ', 'LinhPT', 'MinhNV'],
  },
  {
    id: 'backend',
    name: 'Team Backend',
    members: ['DucLM', 'AnhNT', 'TuanNA'],
  },
];

// ─── Page ────────────────────────────────────────────────────────────────────

export default function TeamPage() {
  const [groups] = useState<TeamGroup[]>(defaultGroups);
  const [filters, setFilters] = useState<TeamFiltersState>(() => {
    const initialMembers = defaultGroups[0]?.members ?? [];
    const names: Record<string, string> = {};
    for (const m of initialMembers) names[m] = m;
    return {
      searchText: '',
      selectedMembers: initialMembers,
      memberDisplayNames: names,
      project: '',
      period: 'week',
      quickFilter: 'all',
      filterStatus: '',
      filterPriority: '',
      filterType: '',
      filterDueDate: '',
      filterHasLog: '',
    };
  });

  // Derive date range from period (same pattern as worklog page)
  const dateRange = useMemo(() => {
    const now = new Date();
    if (filters.period === 'week') {
      const start = startOfWeek(now, { weekStartsOn: 1 });
      return {
        dateFrom: format(start, 'yyyy-MM-dd'),
        dateTo: format(addWeeks(start, 1), 'yyyy-MM-dd'),
      };
    }
    if (filters.period === 'month') {
      const start = startOfMonth(now);
      return {
        dateFrom: format(start, 'yyyy-MM-dd'),
        dateTo: format(addMonths(start, 1), 'yyyy-MM-dd'),
      };
    }
    // custom — show current week as default until user picks custom dates
    const start = startOfWeek(now, { weekStartsOn: 1 });
    return {
      dateFrom: format(start, 'yyyy-MM-dd'),
      dateTo: format(addWeeks(start, 1), 'yyyy-MM-dd'),
    };
  }, [filters.period]);

  // Use selected members directly from filter state
  const { usernames, isAllMembers } = useMemo(() => {
    if (filters.selectedMembers.length === 0) {
      return { usernames: [] as string[], isAllMembers: true };
    }
    return { usernames: filters.selectedMembers, isAllMembers: false };
  }, [filters.selectedMembers]);

  const {
    data,
    dueTasks,
    isLoading,
    error,
  } = useTeamDashboard({
    usernames,
    dateFrom: dateRange.dateFrom,
    dateTo: dateRange.dateTo,
    project: filters.project || undefined,
    allUsers: isAllMembers,
  });

  // Collect unique projects from data
  const allProjects = useMemo(() => {
    if (!data) return [];
    return Array.from(new Set(data.users.flatMap((u) => u.tasks.map((t) => t.projectKey)))).sort();
  }, [data]);

  // Collect unique statuses and types from data
  const uniqueStatuses = useMemo(() => {
    if (!data) return [];
    return Array.from(new Set(data.users.flatMap((u) => u.tasks.map((t) => t.status)))).filter(Boolean).sort();
  }, [data]);

  const uniqueTypes = useMemo(() => {
    if (!data) return [];
    return Array.from(new Set(data.users.flatMap((u) => u.tasks.map((t) => t.issueTypeName)))).filter(Boolean).sort();
  }, [data]);

  // Summary stats
  const totalHours = data ? (data.totalLoggedSeconds / 3600).toFixed(1) : '0';
  const dueTasksCount = dueTasks.length;

  return (
    <div className="p-6 max-w-full mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <h1 className="text-xl font-semibold text-[#172B4D] dark:text-gray-100 flex items-center gap-2">
          <Users size={20} className="text-[#0052CC]" />
          Team Dashboard
        </h1>
      </div>

      {/* Filters */}
      <TeamFilters
        groups={groups}
        filters={filters}
        onChange={setFilters}
        allProjects={allProjects}
        uniqueStatuses={uniqueStatuses}
        uniqueTypes={uniqueTypes}
      />

      {/* Summary bar */}
      {data && (
        <div className="flex items-center gap-4 mt-4 mb-2 text-sm">
          <span className="text-[#172B4D] dark:text-gray-100 font-medium">
            📊 {data.userCount} members
          </span>
          <span className="text-[#5E6C84] dark:text-gray-400">·</span>
          <span className="text-[#172B4D] dark:text-gray-100 font-medium">
            {totalHours}h total
          </span>
          <span className="text-[#5E6C84] dark:text-gray-400">·</span>
          <span className="text-[#172B4D] dark:text-gray-100 font-medium">
            {data.taskCount} tasks
          </span>
          <span className="text-[#5E6C84] dark:text-gray-400">·</span>
          <span className="text-[#172B4D] dark:text-gray-100 font-medium">
            {dueTasksCount} due tasks
          </span>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <p className="text-sm text-[#5E6C84] dark:text-gray-400">Loading team data...</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center justify-center py-16">
          <p className="text-sm text-red-600 dark:text-red-400">
            Failed to load team data. Please try again.
          </p>
        </div>
      )}

      {/* Report Table */}
      {data && !isLoading && (
        <div className="mt-3">
          <TeamReportTable
            data={data}
            filters={filters}
          />
        </div>
      )}
    </div>
  );
}
