'use client';
import { useState, useMemo } from 'react';
import useSWR from 'swr';
import { startOfWeek, addWeeks, subWeeks, addDays, startOfMonth, endOfMonth, format } from 'date-fns';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTeamPlan } from '@/hooks/use-team-plan';
import { fetchTeamFilterMeta } from '@/lib/team-api';
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

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatEstTotal(seconds: number): string {
  if (seconds === 0) return '0h';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h >= 8 && h % 8 === 0 && m === 0) return `${h / 8}d`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function TeamPlanPage() {
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

  // Custom mode dates
  const [customDateFrom, setCustomDateFrom] = useState(() => {
    const start = startOfWeek(new Date(), { weekStartsOn: 1 });
    return format(start, 'yyyy-MM-dd');
  });
  const [customDateTo, setCustomDateTo] = useState(() => {
    const start = startOfWeek(new Date(), { weekStartsOn: 1 });
    return format(addDays(start, 6), 'yyyy-MM-dd');
  });

  // Derive usernames from filter state
  const { usernames, isAllMembers } = useMemo(() => {
    if (filters.selectedMembers.length === 0) {
      return { usernames: [] as string[], isAllMembers: true };
    }
    return { usernames: filters.selectedMembers, isAllMembers: false };
  }, [filters.selectedMembers]);

  // Derive date range from period
  const dateRange = useMemo(() => {
    const now = new Date();
    if (filters.period === 'week') {
      const start = startOfWeek(now, { weekStartsOn: 1 });
      return {
        dateFrom: format(start, 'yyyy-MM-dd'),
        dateTo: format(addDays(start, 6), 'yyyy-MM-dd'),
      };
    }
    if (filters.period === 'month') {
      const start = startOfMonth(now);
      return {
        dateFrom: format(start, 'yyyy-MM-dd'),
        dateTo: format(endOfMonth(now), 'yyyy-MM-dd'),
      };
    }
    return { dateFrom: customDateFrom, dateTo: customDateTo };
  }, [filters.period, customDateFrom, customDateTo]);

  const {
    data,
    isLoading,
    error,
  } = useTeamPlan({
    usernames,
    dateFrom: dateRange.dateFrom,
    dateTo: dateRange.dateTo,
    project: filters.project || undefined,
    allUsers: isAllMembers,
  });

  // Fetch full filter values from ALL sub-tasks
  const filterMetaKey =
    usernames.length > 0 || isAllMembers
      ? ['team-plan-filter-meta', isAllMembers ? 'all' : usernames.join(',')]
      : null;
  const { data: filterMeta } = useSWR(
    filterMetaKey,
    () => fetchTeamFilterMeta(usernames, isAllMembers),
    { revalidateOnFocus: false, dedupingInterval: 60_000 },
  );

  const allProjects = filterMeta?.projects ?? [];
  const uniqueStatuses = filterMeta?.statuses ?? [];
  const uniqueTypes = filterMeta?.types ?? [];

  // Override data's dateRange for table rendering
  const reportData = useMemo(() => {
    if (!data) return undefined;
    return { ...data, dateRange: { from: dateRange.dateFrom, to: dateRange.dateTo } };
  }, [data, dateRange]);

  const totalEstDisplay = data ? formatEstTotal(data.totalEstSeconds) : '0h';

  return (
    <div className="p-6 max-w-full mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <h1 className="text-xl font-semibold text-[#172B4D] dark:text-gray-100 flex items-center gap-2">
          <Calendar size={20} className="text-[#0052CC]" />
          Team Plan
        </h1>
        {filters.period === 'custom' && (
          <div className="flex items-center gap-1.5 ml-4">
            <button
              onClick={() => {
                const start = subWeeks(new Date(customDateFrom), 1);
                setCustomDateFrom(format(start, 'yyyy-MM-dd'));
                setCustomDateTo(format(addDays(start, 6), 'yyyy-MM-dd'));
              }}
              className="p-0.5 rounded hover:bg-[#F4F5F7] dark:hover:bg-gray-800 text-[#5E6C84] dark:text-gray-400"
            >
              <ChevronLeft size={14} />
            </button>
            <input type="date" value={customDateFrom} onChange={(e) => setCustomDateFrom(e.target.value)}
              className="text-xs border border-[#DFE1E6] dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-800 text-[#172B4D] dark:text-gray-100 focus:outline-none focus:border-[#0052CC]" />
            <span className="text-xs text-[#5E6C84] dark:text-gray-400">–</span>
            <input type="date" value={customDateTo} onChange={(e) => setCustomDateTo(e.target.value)}
              className="text-xs border border-[#DFE1E6] dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-800 text-[#172B4D] dark:text-gray-100 focus:outline-none focus:border-[#0052CC]" />
            <button
              onClick={() => {
                const start = addWeeks(new Date(customDateFrom), 1);
                setCustomDateFrom(format(start, 'yyyy-MM-dd'));
                setCustomDateTo(format(addDays(start, 6), 'yyyy-MM-dd'));
              }}
              className="p-0.5 rounded hover:bg-[#F4F5F7] dark:hover:bg-gray-800 text-[#5E6C84] dark:text-gray-400"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        )}
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
            {data.taskCount} tasks
          </span>
          <span className="text-[#5E6C84] dark:text-gray-400">·</span>
          <span className="text-[#172B4D] dark:text-gray-100 font-medium">
            {totalEstDisplay} est total
          </span>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <p className="text-sm text-[#5E6C84] dark:text-gray-400">Loading team plan...</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center justify-center py-16">
          <p className="text-sm text-red-600 dark:text-red-400">
            Failed to load team plan. Please try again.
          </p>
        </div>
      )}

      {/* Report Table */}
      {reportData && !isLoading && (
        <div className="mt-3 overflow-x-auto">
          <TeamReportTable data={reportData} filters={filters} />
        </div>
      )}
    </div>
  );
}
