'use client';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { startOfWeek, subWeeks, addWeeks, addDays, subDays, startOfMonth, subMonths, addMonths, format } from 'date-fns';
import { CheckCircle2, XCircle, Clock, RefreshCw } from 'lucide-react';
import { getStoredUser, api } from '@/lib/api';
import { updateWorklog } from '@/lib/worklog-api';
import { useWorklogs } from '@/hooks/use-worklogs';
import { useWorklogMutations } from '@/hooks/use-worklog-mutations';
import { WorklogCalendar } from '@/components/worklog/worklog-calendar';
import { EMPTY_WORKLOG_FILTERS, applyWorklogFilters, type WorklogFilterBarFilters } from '@/components/worklog/worklog-filter-bar';
import { FilterBar } from '@/components/shared/filter-bar';
import type { UnifiedFilters } from '@/lib/filter-constants';
import { WorklogDrawer } from '@/components/worklog/worklog-drawer';
import { SWIMLANE_PALETTE, type GroupByField } from '@/components/worklog/worklog-day-cell';
import type { WorklogEntry } from '@/types/jira';
import { cn } from '@/lib/utils';
import { DEFAULT_GROUPS, MEMBER_DISPLAY_NAMES, type TeamGroup } from '@/lib/team-constants';
import { GroupSelector } from '@/components/shared/group-selector';
import { GroupByControls } from '@/components/shared/group-by-controls';
import { LoadingOverlay } from '@/components/shared/loading-overlay';

// ─── Page component ──────────────────────────────────────────────────────────

export default function WorklogPage() {
  const [initialized, setInitialized] = useState(false);
  const currentUser = getStoredUser() as { name?: string } | null;
  const currentUsername = currentUser?.name;

  // Filters
  const [filters, setFilters] = useState<WorklogFilterBarFilters>({ ...EMPTY_WORKLOG_FILTERS, period: 'month' });
  const [groupBy, setGroupBy] = useState<string>('none');

  useEffect(() => {
    setFilters(prev => ({
      ...prev,
      groupBy: groupBy === 'none' ? undefined : groupBy as any,
    }));
  }, [groupBy]);

  // ── Group / member filter ────────────────────────────────────────────────
  const [groups] = useState<TeamGroup[]>(DEFAULT_GROUPS);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState<string[]>(
    () => DEFAULT_GROUPS[0]?.members ?? [],
  );
  const [memberDisplayNames, setMemberDisplayNames] = useState<Record<string, string>>(
    () => {
      const names: Record<string, string> = {};
      for (const m of DEFAULT_GROUPS[0]?.members ?? []) {
        names[m] = MEMBER_DISPLAY_NAMES[m] || m;
      }
      return names;
    },
  );

  useEffect(() => {
    if (currentUsername) {
      setFilters(prev => prev.assigneeIn?.length ? prev : { ...prev, assigneeIn: [currentUsername] });
    }
    setInitialized(true);
  }, [currentUsername]);

  // Derive date range from period for API fetching
  const activeFilters = useMemo(() => {
    const now = new Date();
    let from = '';
    let to = '';

    if (filters.period === 'today') {
      from = format(now, 'yyyy-MM-dd');
      to = format(now, 'yyyy-MM-dd');
    } else if (filters.period === 'week') {
      const start = startOfWeek(now, { weekStartsOn: 1 });
      from = format(start, 'yyyy-MM-dd');
      to = format(addWeeks(start, 1), 'yyyy-MM-dd');
    } else if (filters.period === 'month') {
      const start = startOfMonth(now);
      from = format(start, 'yyyy-MM-dd');
      to = format(addMonths(start, 1), 'yyyy-MM-dd');
    } else if (filters.period === 'year') {
      from = format(new Date(now.getFullYear(), 0, 1), 'yyyy-MM-dd');
      to = format(new Date(now.getFullYear(), 11, 31), 'yyyy-MM-dd');
    }

    return {
      usernames: selectedMembers.length > 0 ? selectedMembers : [currentUsername || ''],
      dateFrom: from,
      dateTo: to,
    };
  }, [filters, currentUsername, selectedMembers]);

  const { data, entriesByDate: rawEntriesByDate, isLoading, mutate } = useWorklogs(
    initialized ? activeFilters : null,
  );

  // Apply client-side filters
  const filteredEntries = useMemo(() => {
    if (!data?.entries) return [];
    return applyWorklogFilters(data.entries, filters, currentUsername, selectedMembers);
  }, [data, filters, currentUsername, selectedMembers]);

  const entriesByDate = useMemo(() => {
    const map: Record<string, WorklogEntry[]> = {};
    for (const e of filteredEntries) {
      const d = new Date(e.started).toISOString().slice(0, 10);
      (map[d] ??= []).push(e);
    }
    return map;
  }, [filteredEntries]);

  const dailyHours = useMemo(() => {
    const map: Record<string, number> = {};
    for (const e of filteredEntries) {
      const d = new Date(e.started).toISOString().slice(0, 10);
      map[d] = (map[d] ?? 0) + e.timeSpentSeconds / 3600;
    }
    return map;
  }, [filteredEntries]);

  // ── Member helpers ─────────────────────────────────────────────────────────

  function addMember(username: string, displayName: string) {
    if (selectedMembers.includes(username)) return;
    setSelectedMembers(prev => [...prev, username]);
    setMemberDisplayNames(prev => ({ ...prev, [username]: displayName }));
  }

  function removeMember(username: string) {
    setSelectedMembers(prev => prev.filter(m => m !== username));
  }

  function selectAllMembers() {
    setSelectedMembers([]);
  }

  function selectGroup(group: TeamGroup) {
    const names: Record<string, string> = {};
    for (const m of group.members) names[m] = MEMBER_DISPLAY_NAMES[m] || m;
    setSelectedMembers(group.members);
    setMemberDisplayNames(prev => ({ ...prev, ...names }));
  }

  // Calendar state
  const [baseDate, setBaseDate] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [mode, setMode] = useState<'day' | 'week' | 'month'>('month');

  const handleNavigate = useCallback((direction: 'prev' | 'next') => {
    setBaseDate((prev: Date) => {
      if (mode === 'day') return direction === 'prev' ? subDays(prev, 1) : addDays(prev, 1);
      if (mode === 'week') return direction === 'prev' ? subWeeks(prev, 1) : addWeeks(prev, 1);
      return direction === 'prev' ? subMonths(prev, 1) : addMonths(prev, 1);
    });
  }, [mode]);

  // CRUD
  const { add, update, remove, toast } = useWorklogMutations(() => mutate());

  // Drawer
  const [drawerEntry, setDrawerEntry] = useState<WorklogEntry | null>(null);

  const issueDailyHours = useMemo(() => {
    if (!drawerEntry || !data) return 0;
    const dateKey = new Date(drawerEntry.started).toISOString().slice(0, 10);
    const dayEntries = data.entries.filter(
      e => e.issueKey === drawerEntry.issueKey &&
           new Date(e.started).toISOString().slice(0, 10) === dateKey,
    );
    return dayEntries.reduce((sum, e) => sum + e.timeSpentSeconds / 3600, 0);
  }, [drawerEntry, data]);

  const handleDragEnd = useCallback(async (entryId: string, newDate: string) => {
    if (!data) return;
    const entry = data.entries.find(e => e.id === entryId);
    if (!entry) return;
    const oldDate = new Date(entry.started).toISOString().slice(0, 10);
    if (oldDate === newDate) return;
    const oldStarted = new Date(entry.started);
    const newStarted = `${newDate}T${format(oldStarted, 'HH:mm')}:00.000+0700`;
    try {
      await updateWorklog(entry.issueKey, entry.id, {
        timeSpentSeconds: entry.timeSpentSeconds,
        comment: entry.comment,
        started: newStarted,
      });
      mutate();
    } catch { /* handled by hook toast */ }
  }, [data, mutate]);

  const handleDayClick = useCallback((_date: Date) => {
    // Placeholder for add dialog
  }, []);

  // Week progress
  const weekProgress = useMemo(() => {
    if (!data) return null;
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    let total = 0;
    let workDays = 0;
    for (let i = 0; i < 5; i++) {
      const d = addDays(weekStart, i);
      const key = format(d, 'yyyy-MM-dd');
      total += data.dailyHours[key] ?? 0;
      workDays++;
    }
    return { total, required: workDays * 8 };
  }, [data]);

  // Map filter groupBy/subGroupBy to day cell GroupByField
  const groupByField = useMemo(() => {
    if (!filters.groupBy || filters.groupBy === 'None') return null;
    return filters.groupBy.toLowerCase() as GroupByField;
  }, [filters.groupBy]);

  const totalFiltered = filteredEntries.length;
  const totalFilteredHours = filteredEntries.reduce((s, e) => s + e.timeSpentSeconds / 3600, 0);

  return (
    <div className="flex flex-col h-screen p-6 relative">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div>
          <h1 className="text-xl font-semibold text-[#172B4D] dark:text-gray-100 flex items-center gap-2">
            <Clock size={20} className="text-[#0052CC]" />
            Worklog Calendar
          </h1>
          <p className="text-sm text-[#5E6C84] dark:text-gray-400 mt-0.5 flex items-center gap-2">
            {totalFiltered} entries · {totalFilteredHours.toFixed(1)}h total
            {weekProgress && (
              <span className={`text-xs ml-1 px-2 py-0.5 rounded-full font-medium ${
                weekProgress.total >= weekProgress.required
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
              }`}>
                {weekProgress.total.toFixed(1)}h / {weekProgress.required}h this week
              </span>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={async () => { setIsRefreshing(true); await mutate(); setIsRefreshing(false); }}
          disabled={isRefreshing}
          className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded border border-[#DFE1E6] dark:border-gray-600 bg-white dark:bg-gray-800 text-[#5E6C84] dark:text-gray-400 hover:bg-[#F4F5F7] dark:hover:bg-gray-700 transition-colors shrink-0"
        >
          <RefreshCw size={13} className={isRefreshing ? 'animate-spin' : ''} />
          <span>{isRefreshing ? 'Refreshing…' : 'Refresh'}</span>
        </button>
      </div>

      <GroupSelector
        groups={groups}
        selectedMembers={selectedMembers}
        memberDisplayNames={memberDisplayNames}
        onAddMember={addMember}
        onRemoveMember={removeMember}
        onSelectGroup={selectGroup}
        onSelectAllMembers={selectAllMembers}
      >
        {/* Color legend — member → color mapping */}
        {selectedMembers.length > 1 && (
          <div className="px-4 py-2 flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-medium text-[#5E6C84] dark:text-gray-400">Colors:</span>
            {[...selectedMembers].sort().map((m, i) => (
              <span key={m} className="inline-flex items-center gap-1 text-[10px] text-[#5E6C84] dark:text-gray-400">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: SWIMLANE_PALETTE[i % SWIMLANE_PALETTE.length] }} />
                {memberDisplayNames[m] || m}
              </span>
            ))}
          </div>
        )}
      </GroupSelector>

      <GroupByControls
        groupBy={groupBy}
        subGroupBy="none"
        subSubGroupBy="none"
        onGroupByChange={setGroupBy}
        onSubGroupByChange={() => {}}
        onSubSubGroupByChange={() => {}}
        groupByOptions={['none', 'project', 'assignee', 'priority', 'type', 'parent', 'status', 'sprint', 'statusCategory', 'reporter']}
        levels={1}
      />

      {/* Filters */}
      <FilterBar
        filters={filters as unknown as UnifiedFilters}
        onChange={(f) => setFilters(f as unknown as WorklogFilterBarFilters)}
        period={{
          options: [
            { key: 'today', label: 'Today' },
            { key: 'week', label: 'Week' },
            { key: 'month', label: 'Month' },
            { key: 'year', label: 'Year' },
          ],
          active: filters.period,
          onChange: (key) => setFilters(prev => ({ ...prev, period: key as WorklogFilterBarFilters['period'] })),
        }}
        quickPills={[
          { key: 'onlyMyIssues', label: 'Only My Issues', active: filters.onlyMyIssues ?? false, onToggle: () => setFilters(prev => ({ ...prev, onlyMyIssues: !prev.onlyMyIssues })) },
          { key: 'recentlyUpdated', label: 'Recently Updated', active: filters.recentlyUpdated ?? false, onToggle: () => setFilters(prev => ({ ...prev, recentlyUpdated: !prev.recentlyUpdated })) },
          { key: 'dueThisWeek', label: 'Due This Week', active: filters.dueThisWeek ?? false, onToggle: () => setFilters(prev => ({ ...prev, dueThisWeek: !prev.dueThisWeek })) },
          { key: 'highPriority', label: 'High Priority', active: filters.highPriority ?? false, onToggle: () => setFilters(prev => ({ ...prev, highPriority: !prev.highPriority })) },
        ]}
      />

      {/* Calendar */}
      <div className="flex-1 min-h-0 mt-4">
        <WorklogCalendar
          mode={mode}
          baseDate={baseDate}
          entriesByDate={entriesByDate}
          dailyHours={dailyHours}
          groupBy={groupByField}
          onNavigate={handleNavigate}
          onModeChange={setMode}
          onEntryClick={setDrawerEntry}
          onDayClick={handleDayClick}
          onDragEnd={handleDragEnd}
        />
      </div>

      {/* Edit Drawer */}
      <WorklogDrawer
        entry={drawerEntry}
        onClose={() => setDrawerEntry(null)}
        onSave={(changes) => drawerEntry && update(drawerEntry, changes)}
        onDelete={() => drawerEntry && remove(drawerEntry)}
        issueDailyHours={issueDailyHours}
      />

      {/* Toast */}
      {toast && (
        <div className={cn(
          'fixed bottom-6 right-6 z-[60] flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium',
          toast.type === 'success' ? 'bg-[#36B37E] text-white' : 'bg-red-500 text-white',
        )}>
          {toast.type === 'success' ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
          {toast.message}
        </div>
      )}
      <LoadingOverlay loading={isRefreshing} message="Refreshing…" />
    </div>
  );
}
