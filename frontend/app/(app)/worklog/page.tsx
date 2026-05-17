'use client';
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { startOfWeek, subWeeks, addWeeks, addDays, subDays, startOfMonth, subMonths, addMonths, format } from 'date-fns';
import { CheckCircle2, XCircle, Clock, Users, ChevronDown, ChevronUp, X } from 'lucide-react';
import { getStoredUser, api } from '@/lib/api';
import { updateWorklog } from '@/lib/worklog-api';
import { useWorklogs } from '@/hooks/use-worklogs';
import { useWorklogMutations } from '@/hooks/use-worklog-mutations';
import { WorklogCalendar } from '@/components/worklog/worklog-calendar';
import { WorklogFilterBar, EMPTY_WORKLOG_FILTERS, applyWorklogFilters, type WorklogFilterBarFilters } from '@/components/worklog/worklog-filter-bar';
import { WorklogDrawer } from '@/components/worklog/worklog-drawer';
import { SWIMLANE_PALETTE } from '@/components/worklog/worklog-day-cell';
import type { WorklogEntry, TeamGroup } from '@/types/jira';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

interface JiraUserResult {
  name: string;
  displayName: string;
}

// ─── Default groups ───────────────────────────────────────────────────────────

const defaultGroups: TeamGroup[] = [
  { id: 'rd1', name: 'R&D1', members: ['SangNT', 'TriHD', 'NghiaDT', 'ThinhTPQ', 'HieuDT', 'PhatNH'] },
  { id: 'frontend', name: 'Team Frontend', members: ['SangNT', 'PhatNH', 'HuyNQ', 'LinhPT', 'MinhNV'] },
  { id: 'backend', name: 'Team Backend', members: ['DucLM', 'AnhNT', 'TuanNA'] },
];

const MEMBER_DISPLAY_NAMES: Record<string, string> = {
  SangNT: 'Sang Nguyen Thanh', TriHD: 'Tri Hoang Duc', NghiaDT: 'Nghia Dinh Trong',
  ThinhTPQ: 'Thinh Tran Phu Quoc', HieuDT: 'Hieu Dinh Trong', PhatNH: 'Phat Nguyen Huu',
  HuyNQ: 'Huy Nguyen Quoc', LinhPT: 'Linh Pham Thi', MinhNV: 'Minh Nguyen Van',
  DucLM: 'Duc Le Minh', AnhNT: 'Anh Nguyen Tuan', TuanNA: 'Tuan Nguyen Anh',
};

// ─── Page component ──────────────────────────────────────────────────────────

export default function WorklogPage() {
  const [initialized, setInitialized] = useState(false);
  const currentUser = getStoredUser() as { name?: string } | null;
  const currentUsername = currentUser?.name;

  // Filters
  const [filters, setFilters] = useState<WorklogFilterBarFilters>({ ...EMPTY_WORKLOG_FILTERS, period: 'month' });

  // ── Group / member filter ────────────────────────────────────────────────
  const [groups] = useState<TeamGroup[]>(defaultGroups);
  const [selectedMembers, setSelectedMembers] = useState<string[]>(
    () => defaultGroups[0]?.members ?? [],
  );
  const [memberDisplayNames, setMemberDisplayNames] = useState<Record<string, string>>(
    () => {
      const names: Record<string, string> = {};
      for (const m of defaultGroups[0]?.members ?? []) {
        names[m] = MEMBER_DISPLAY_NAMES[m] || m;
      }
      return names;
    },
  );
  const [memberSearch, setMemberSearch] = useState('');
  const [memberResults, setMemberResults] = useState<JiraUserResult[]>([]);
  const [showMemberDropdown, setShowMemberDropdown] = useState(false);
  const [showGroupDropdown, setShowGroupDropdown] = useState(false);
  const [showGroupSection, setShowGroupSection] = useState(true);
  const memberRef = useRef<HTMLDivElement>(null);
  const groupRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    setMemberSearch('');
    setShowMemberDropdown(false);
  }

  function removeMember(username: string) {
    setSelectedMembers(prev => prev.filter(m => m !== username));
  }

  function selectAllMembers() {
    setSelectedMembers([]);
    setShowGroupDropdown(false);
  }

  function selectGroup(group: TeamGroup) {
    const names: Record<string, string> = {};
    for (const m of group.members) names[m] = MEMBER_DISPLAY_NAMES[m] || m;
    setSelectedMembers(group.members);
    setMemberDisplayNames(prev => ({ ...prev, ...names }));
    setShowGroupDropdown(false);
  }

  const isAllMembers = selectedMembers.length === 0;

  // ── Member search debounce ──────────────────────────────────────────────────

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (memberSearch.length < 1) { setMemberResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      try {
        const r = await api.get<JiraUserResult[]>('/user/search', {
          params: { username: memberSearch, maxResults: 12 },
        });
        setMemberResults(Array.isArray(r.data) ? r.data : []);
      } catch { setMemberResults([]); }
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [memberSearch]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (memberRef.current && !memberRef.current.contains(e.target as Node))
        setShowMemberDropdown(false);
      if (groupRef.current && !groupRef.current.contains(e.target as Node))
        setShowGroupDropdown(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

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
    return filters.groupBy.toLowerCase() as 'project' | 'type' | 'assignee' | 'status';
  }, [filters.groupBy]);

  const totalFiltered = filteredEntries.length;
  const totalFilteredHours = filteredEntries.reduce((s, e) => s + e.timeSpentSeconds / 3600, 0);

  return (
    <div className="flex flex-col h-screen p-6">
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
      </div>

      {/* ── Team + Stats card ── */}
      <div className="mb-4 rounded-sm border border-[#DFE1E6] dark:border-gray-700 bg-[#F4F5F7] dark:bg-gray-800/60">
        {/* Header */}
        <div
          onClick={() => setShowGroupSection(!showGroupSection)}
          className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-[#EBECF0] dark:hover:bg-gray-800 transition-colors cursor-pointer"
          role="button"
          tabIndex={0}
          onKeyDown={e => { if (e.key === 'Enter') setShowGroupSection(!showGroupSection); }}
        >
          <div className="flex items-center gap-2">
            <Users size={16} className="text-[#0052CC]" />
            <span className="text-sm font-semibold text-[#172B4D] dark:text-gray-100">
              {!isAllMembers
                ? groups.find(g => g.members.every(m => selectedMembers.includes(m)) && g.members.length === selectedMembers.length)?.name ?? `${selectedMembers.length} members`
                : 'All Members'}
            </span>
            {!isAllMembers && (
              <span className="text-xs bg-[#0052CC] text-white px-2 py-0.5 rounded-full font-medium">
                {selectedMembers.length}
              </span>
            )}
          </div>

          {showGroupSection ? <ChevronUp size={14} className="text-[#5E6C84]" /> : <ChevronDown size={14} className="text-[#5E6C84]" />}
        </div>

        {showGroupSection && (
          <>
            {/* Stats row */}
            <div className="flex items-center gap-3 px-4 pb-2 text-xs text-[#5E6C84] dark:text-gray-400">
              <span className="font-medium text-[#172B4D] dark:text-gray-100">
                {totalFiltered} entries
              </span>
              <span>·</span>
              <span>{totalFilteredHours.toFixed(1)}h total</span>
              {filters.period && (
                <>
                  <span>·</span>
                  <span>Period: {filters.period === 'today' ? 'Today' : filters.period === 'week' ? 'This Week' : filters.period === 'month' ? 'This Month' : 'This Year'}</span>
                </>
              )}
            </div>

            {/* Member chips */}
            <div className="flex items-center gap-3 px-4 pb-3 flex-wrap">
              <div className="relative" ref={memberRef}>
                <div className="flex items-center gap-1.5">
                  <div
                    className="flex items-center flex-wrap gap-1 border border-[#DFE1E6] dark:border-gray-600 rounded bg-white dark:bg-gray-800 min-w-[200px] px-2 py-1 min-h-[30px] cursor-text"
                    onClick={() => setShowMemberDropdown(true)}
                  >
                    {isAllMembers ? (
                      <span className="text-xs text-[#5E6C84] dark:text-gray-400">All Members</span>
                    ) : (
                      <>
                        {selectedMembers.slice(0, 5).map(m => (
                          <span key={m} className="inline-flex items-center gap-0.5 text-[10px] bg-[#E6F0FF] dark:bg-blue-900/40 text-[#0052CC] dark:text-blue-300 border border-[#0052CC]/20 rounded px-1.5 py-0.5">
                            {memberDisplayNames[m] || m}
                            <button onClick={e => { e.stopPropagation(); removeMember(m); }} className="hover:text-red-500">
                              <X size={9} />
                            </button>
                          </span>
                        ))}
                        {selectedMembers.length > 5 && (
                          <span className="text-[10px] text-[#5E6C84]">+{selectedMembers.length - 5} more</span>
                        )}
                        <button onClick={e => { e.stopPropagation(); setSelectedMembers([]); }} className="text-[10px] text-[#5E6C84] hover:text-red-500 ml-auto">
                          clear
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {showMemberDropdown && (
                  <div className="absolute top-full left-0 mt-1 w-64 bg-white dark:bg-gray-800 border border-[#DFE1E6] dark:border-gray-600 rounded shadow-lg z-40 max-h-64 overflow-y-auto">
                    <div className="p-1.5 border-b border-[#DFE1E6] dark:border-gray-700">
                      <input type="text" autoFocus value={memberSearch}
                        onChange={e => setMemberSearch(e.target.value)}
                        placeholder="Search member..."
                        className="w-full text-xs border border-[#DFE1E6] dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-800 text-[#172B4D] dark:text-gray-100 focus:outline-none focus:border-[#0052CC]" />
                    </div>
                    {memberSearch.length > 0 ? (
                      memberResults.map(u => (
                        <button key={u.name} type="button"
                          onClick={() => addMember(u.name, u.displayName)}
                          className="w-full text-left px-3 py-2 text-xs hover:bg-[#F4F5F7] dark:hover:bg-gray-700 text-[#172B4D] dark:text-gray-200 flex items-center justify-between">
                          <span>{u.displayName}</span>
                          {selectedMembers.includes(u.name) && <span className="text-[#0052CC]">✓</span>}
                        </button>
                      ))
                    ) : (
                      <p className="text-xs text-[#5E6C84] px-3 py-4 text-center">Type to search members</p>
                    )}
                  </div>
                )}
              </div>

              {/* Group shortcut */}
              <div className="relative" ref={groupRef}>
                <button
                  onClick={() => setShowGroupDropdown(!showGroupDropdown)}
                  className="text-xs border border-[#DFE1E6] dark:border-gray-600 rounded px-2 py-1.5 bg-white dark:bg-gray-800 text-[#5E6C84] dark:text-gray-400 hover:bg-[#F4F5F7] dark:hover:bg-gray-700 flex items-center gap-1"
                >
                  <Users size={11} />
                  Groups
                  <ChevronDown size={10} />
                </button>
                {showGroupDropdown && (
                  <div className="absolute top-full left-0 mt-1 w-48 bg-white dark:bg-gray-800 border border-[#DFE1E6] dark:border-gray-600 rounded shadow-lg z-40">
                    <button onClick={selectAllMembers} className="w-full text-left px-3 py-2 text-xs hover:bg-[#F4F5F7] dark:hover:bg-gray-700 text-[#172B4D] dark:text-gray-200 border-b border-[#DFE1E6] dark:border-gray-700">
                      🌐 All Members
                    </button>
                    {groups.map(g => (
                      <button key={g.id} onClick={() => selectGroup(g)} className="w-full text-left px-3 py-2 text-xs hover:bg-[#F4F5F7] dark:hover:bg-gray-700 text-[#172B4D] dark:text-gray-200 flex items-center justify-between">
                        <span>{g.name}</span>
                        <span className="text-[10px] text-[#5E6C84]">{g.members.length}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
        {/* Color legend — member → color mapping */}
        {selectedMembers.length > 1 && (
          <div className="border-t border-[#DFE1E6] dark:border-gray-600 px-4 py-2 flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-medium text-[#5E6C84] dark:text-gray-400">Colors:</span>
            {[...selectedMembers].sort().map((m, i) => (
              <span key={m} className="inline-flex items-center gap-1 text-[10px] text-[#5E6C84] dark:text-gray-400">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: SWIMLANE_PALETTE[i % SWIMLANE_PALETTE.length] }} />
                {memberDisplayNames[m] || m}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Filters */}
      <WorklogFilterBar
        filters={filters}
        onChange={setFilters}
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
    </div>
  );
}
