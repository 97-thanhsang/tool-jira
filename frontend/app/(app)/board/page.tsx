'use client';
import { useState, useEffect, useRef, useMemo } from 'react';
import { api, getStoredUser } from '@/lib/api';
import { startOfWeek, addDays, startOfMonth, endOfMonth, startOfYear, endOfYear, format } from 'date-fns';
import { RefreshCw, CheckCircle2, XCircle, Users, ChevronDown, ChevronUp, X } from 'lucide-react';
import { useBoardState } from '@/hooks/use-board-state';
import { useStatusColumns } from '@/hooks/use-status-columns';
import { KanbanBoard, type BoardColumn, type BoardColumnDef, type SwimlaneStats } from '@/components/board/kanban-board';
import { EMPTY_FILTERS, applyFilters, type BoardFilters } from '@/components/board/board-filters';
import { BoardFilterBar } from '@/components/board/board-filter-bar';
import { QuickViewPanel } from '@/components/board/quick-view-panel';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { JiraIssue } from '@/types/jira';
import type { TeamGroup } from '@/types/jira';

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

/** Display name mapping — used for member chips and swimlane headers. */
const MEMBER_DISPLAY_NAMES: Record<string, string> = {
  SangNT: 'Sang Nguyen Thanh',
  TriHD: 'Tri Hoang Duc',
  NghiaDT: 'Nghia Dinh Trong',
  ThinhTPQ: 'Thinh Tran Phu Quoc',
  HieuDT: 'Hieu Dinh Trong',
  PhatNH: 'Phat Nguyen Huu',
  HuyNQ: 'Huy Nguyen Quoc',
  LinhPT: 'Linh Pham Thi',
  MinhNV: 'Minh Nguyen Van',
  DucLM: 'Duc Le Minh',
  AnhNT: 'Anh Nguyen Tuan',
  TuanNA: 'Tuan Nguyen Anh',
};

// ─── Page component ──────────────────────────────────────────────────────────

export default function BoardPage() {
  const currentUser = getStoredUser() as { name?: string } | null;
  const currentUsername = currentUser?.name;

  // Status-based 5-column mapping
  const { statusColumnMap } = useStatusColumns();

  // Filter state
  const [filters, setFilters] = useState<BoardFilters>(EMPTY_FILTERS);
  const [quickViewKey, setQuickViewKey] = useState<string | null>(null);

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

  // Build dynamic JQL: expand beyond currentUser when viewing team members
  const boardJql = useMemo<string | undefined>(() => {
    if (selectedMembers.length === 0) return undefined; // "All Members" — use default (currentUser)
    if (!currentUsername) return undefined;

    // If only currentUser is selected, use default (faster, cached)
    if (selectedMembers.length === 1 && selectedMembers[0] === currentUsername) {
      return undefined;
    }

    // Team mode: fetch issues for all selected members
    const assigneeClause = selectedMembers
      .map(m => `assignee = "${m}"`)
      .join(' OR ');
    return `(${assigneeClause}) AND resolution = Unresolved ORDER BY updated DESC`;
  }, [selectedMembers, currentUsername]);

  const { grouped, dynamicColumns, isLoading, error, mutate, moveCard, toast } =
    useBoardState(statusColumnMap, boardJql);

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

  // Derive date range from period filter
  const dateFiltered = useMemo(() => {
    if (!filters.period) return filters;
    const now = new Date();
    let dateFrom: string;
    let dateTo: string;

    switch (filters.period) {
      case 'today':
        dateFrom = format(now, 'yyyy-MM-dd');
        dateTo = dateFrom;
        break;
      case 'week':
        dateFrom = format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd');
        dateTo = format(addDays(startOfWeek(now, { weekStartsOn: 1 }), 6), 'yyyy-MM-dd');
        break;
      case 'month':
        dateFrom = format(startOfMonth(now), 'yyyy-MM-dd');
        dateTo = format(endOfMonth(now), 'yyyy-MM-dd');
        break;
      case 'year':
        dateFrom = format(startOfYear(now), 'yyyy-MM-dd');
        dateTo = format(endOfYear(now), 'yyyy-MM-dd');
        break;
    }

    return { ...filters, dateFrom, dateTo };
  }, [filters]);

  // effectiveFilters: dateFiltered + BoardFilterBar filters (groups handled via JQL)
  const effectiveFilters = dateFiltered;

  // Apply client-side filters to each column
  const filteredGrouped = useMemo(() => {
    const result: Record<string, JiraIssue[]> = {};
    for (const [colName, issues] of Object.entries(grouped)) {
      result[colName] = applyFilters(issues, effectiveFilters, currentUsername);
    }
    return result;
  }, [grouped, effectiveFilters, currentUsername]);

  // Build dynamic BoardColumn array
  const columns: BoardColumn[] = useMemo(() => {
    if (dynamicColumns.length > 0) {
      return dynamicColumns.map(col => ({
        id: col.name.toLowerCase().replace(/\s+/g, '-'),
        label: col.name,
        issues: filteredGrouped[col.name] || [],
        color: col.color,
        wipMin: col.wipMin,
        wipMax: col.wipMax,
        statusIds: col.statusIds,
      }));
    }
    return [
      { id: 'to-do', label: 'To Do', issues: filteredGrouped['To Do'] || [], color: '#5E6C84', wipMax: 5, statusIds: [] },
      { id: 'in-progress', label: 'In Progress', issues: filteredGrouped['In Progress'] || [], color: '#0052CC', wipMax: 5, statusIds: [] },
      { id: 'done', label: 'Done', issues: filteredGrouped['Done'] || [], color: '#36B37E', statusIds: [] },
    ];
  }, [dynamicColumns, filteredGrouped]);

  // ── 3-level grouping for swimlanes ──────────────────────────────────────
  type GroupBy      = 'none' | 'project' | 'assignee' | 'priority' | 'type';
  type SubGroupBy   = 'none' | 'assignee' | 'priority' | 'type';
  type SubSubGroupBy = 'none' | 'priority' | 'type';

  const [groupBy, setGroupBy]             = useState<GroupBy>('none');
  const [subGroupBy, setSubGroupBy]       = useState<SubGroupBy>('none');
  const [subSubGroupBy, setSubSubGroupBy] = useState<SubSubGroupBy>('none');

  // Get a field value from an issue for grouping
  function getFieldValue(issue: JiraIssue, field: GroupBy | SubGroupBy | SubSubGroupBy): { key: string; label: string } | null {
    if (field === 'none') return null;
    switch (field) {
      case 'project':
        return { key: issue.fields.project.key, label: `${issue.fields.project.name} (${issue.fields.project.key})` };
      case 'assignee': {
        const name = issue.fields.assignee?.name ?? '__unassigned';
        const label = MEMBER_DISPLAY_NAMES[name] ?? issue.fields.assignee?.displayName ?? 'Unassigned';
        return { key: name, label };
      }
      case 'priority':
        return { key: issue.fields.priority?.name ?? 'None', label: issue.fields.priority?.name ?? 'None' };
      case 'type':
        return { key: issue.fields.issuetype.name, label: issue.fields.issuetype.name };
      default:
        return null;
    }
  }

  // Composite swimlane computation (3-level nesting)
  const swimlanes = useMemo(() => {
    if (groupBy === 'none') return undefined;

    const colNames = dynamicColumns.length > 0
      ? dynamicColumns.map(c => c.name)
      : ['To Do', 'In Progress', 'Done'];

    // Collect all issues
    const allIssues: { issue: JiraIssue; colName: string }[] = [];
    for (const [colName, issues] of Object.entries(filteredGrouped)) {
      for (const issue of issues) allIssues.push({ issue, colName });
    }

    // Group → SubGroup → SubSubGroup → columns
    const tree = new Map<string, Map<string, Map<string, Record<string, JiraIssue[]>>>>();

    for (const { issue, colName } of allIssues) {
      const g1 = getFieldValue(issue, groupBy);
      const g2 = subGroupBy !== 'none' ? getFieldValue(issue, subGroupBy) : null;
      const g3 = subSubGroupBy !== 'none' ? getFieldValue(issue, subSubGroupBy) : null;
      if (!g1) continue;

      const g1Key = g1.key;
      const g2Key = g2?.key ?? '__none';
      const g3Key = g3?.key ?? '__none';

      if (!tree.has(g1Key)) tree.set(g1Key, new Map());
      if (!tree.get(g1Key)!.has(g2Key)) tree.get(g1Key)!.set(g2Key, new Map());
      if (!tree.get(g1Key)!.get(g2Key)!.has(g3Key)) {
        const emptyCols: Record<string, JiraIssue[]> = {};
        for (const cn of colNames) emptyCols[cn] = [];
        tree.get(g1Key)!.get(g2Key)!.set(g3Key, emptyCols);
      }
      tree.get(g1Key)!.get(g2Key)!.get(g3Key)![colName]?.push(issue);
    }

    // Flatten into swimlanes with composite labels
    const result: { key: string; columns: Record<string, JiraIssue[]>; stats?: SwimlaneStats }[] = [];

    const sortedG1 = Array.from(tree.entries()).sort(([a], [b]) => {
      if (a === '__unassigned' || a === 'None') return 1;
      if (b === '__unassigned' || b === 'None') return -1;
      return a.localeCompare(b);
    });

    for (const [g1Key, subMap] of sortedG1) {
      const g1Label = getFieldValue({ fields: { project: { key: g1Key, name: g1Key }, assignee: { name: g1Key, displayName: g1Key }, priority: { name: g1Key }, issuetype: { name: g1Key } } } as unknown as JiraIssue, groupBy)?.label ?? g1Key;

      const sortedG2 = Array.from(subMap.entries()).sort(([a], [b]) => {
        if (a === '__unassigned' || a === 'None') return 1;
        if (b === '__unassigned' || b === 'None') return -1;
        return a.localeCompare(b);
      });

      for (const [g2Key, subSubMap] of sortedG2) {
        const g2Label = subGroupBy !== 'none' && g2Key !== '__none'
          ? getFieldValue({ fields: { assignee: { name: g2Key, displayName: g2Key }, priority: { name: g2Key }, issuetype: { name: g2Key } } } as unknown as JiraIssue, subGroupBy)?.label ?? g2Key
          : '';

        const sortedG3 = Array.from(subSubMap.entries()).sort(([a], [b]) => {
          if (a === 'None') return 1;
          if (b === 'None') return -1;
          return a.localeCompare(b);
        });

        for (const [g3Key, columns] of sortedG3) {
          const g3Label = subSubGroupBy !== 'none' && g3Key !== '__none'
            ? getFieldValue({ fields: { priority: { name: g3Key }, issuetype: { name: g3Key } } } as unknown as JiraIssue, subSubGroupBy)?.label ?? g3Key
            : '';

          const parts = [g1Label];
          if (g2Label) parts.push(g2Label);
          if (g3Label) parts.push(g3Label);
          const label = parts.join(' → ');

          result.push({ key: label, columns });
        }
      }
    }

    // Add stats for assignee grouping
    if (groupBy === 'assignee') {
      for (const lane of result) {
        const allIssues = Object.values(lane.columns).flat();
        let totalEstSeconds = 0;
        let totalLoggedSeconds = 0;
        let todoCount = 0;
        let inProgressCount = 0;
        let doneCount = 0;

        for (const issue of allIssues) {
          totalEstSeconds += issue.fields.timetracking?.originalEstimateSeconds ?? 0;
          totalLoggedSeconds += issue.fields.timetracking?.timeSpentSeconds ?? 0;
          const cat = issue.fields.status.statusCategory.key;
          if (cat === 'new') todoCount++;
          else if (cat === 'indeterminate') inProgressCount++;
          else if (cat === 'done') doneCount++;
        }

        lane.stats = {
          taskCount: allIssues.length,
          totalEstSeconds,
          totalLoggedSeconds,
          todoCount,
          inProgressCount,
          doneCount,
        };
      }
    }

    return result;
  }, [groupBy, subGroupBy, subSubGroupBy, filteredGrouped, dynamicColumns]);

  const columnDefs = useMemo(() => {
    if (!swimlanes) return undefined;
    if (dynamicColumns.length > 0) {
      return dynamicColumns.map(col => ({
        id: col.name.toLowerCase().replace(/\s+/g, '-'),
        label: col.name,
        color: col.color,
        wipMin: col.wipMin,
        wipMax: col.wipMax,
        statusIds: col.statusIds,
      }));
    }
    return [
      { id: 'to-do', label: 'To Do', color: '#5E6C84', wipMax: 5, statusIds: [] },
      { id: 'in-progress', label: 'In Progress', color: '#0052CC', wipMax: 5, statusIds: [] },
      { id: 'done', label: 'Done', color: '#36B37E', statusIds: [] },
    ];
  }, [swimlanes, dynamicColumns]);

  if (error) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-600 dark:text-red-400 mb-2 text-sm">Failed to load issues</p>
        <Button variant="outline" size="sm" onClick={() => mutate()}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <h1 className="text-xl font-semibold text-[#172B4D] dark:text-gray-100">
          My Board
        </h1>
        <Button
          variant="outline"
          size="sm"
          onClick={() => mutate()}
          disabled={isLoading}
          className="border-[#DFE1E6] dark:border-gray-700 text-[#5E6C84] dark:text-gray-400 hover:bg-[#F4F5F7] dark:hover:bg-gray-800 shrink-0"
        >
          <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          <span className="ml-1.5">Refresh</span>
        </Button>
      </div>

      {/* ── Team + Stats + Group-by (unified card) ── */}
      <div className="mb-4 rounded-sm border border-[#DFE1E6] dark:border-gray-700 bg-[#F4F5F7] dark:bg-gray-800/60">
        {/* Header */}
        <button
          onClick={() => setShowGroupSection(!showGroupSection)}
          className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-[#EBECF0] dark:hover:bg-gray-800 transition-colors"
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
        </button>

        {showGroupSection && (
          <>
            {/* Stats row */}
            <div className="flex items-center gap-3 px-4 pb-2 text-xs text-[#5E6C84] dark:text-gray-400">
              <span className="font-medium text-[#172B4D] dark:text-gray-100">
                {Object.values(filteredGrouped).reduce((s, arr) => s + arr.length, 0)} issues
              </span>
              {(filters.searchText || (filters.projectIn?.length ?? 0) > 0 || (filters.issuetypeIn?.length ?? 0) > 0 || (filters.statusIn?.length ?? 0) > 0 || (filters.priorityIn?.length ?? 0) > 0 || (filters.assigneeIn?.length ?? 0) > 0 || (filters.sprintIn?.length ?? 0) > 0 || (filters.reporterIn?.length ?? 0) > 0 || !!filters.period) && (
                <>
                  <span>·</span>
                  <span>Filtered</span>
                </>
              )}
              <span>·</span>
              <span>{dynamicColumns.length > 0 ? dynamicColumns.length : 3} columns</span>
              {filters.period && (
                <>
                  <span>·</span>
                  <span>Due: {filters.period === 'today' ? 'Today' : filters.period === 'week' ? 'This Week' : filters.period === 'month' ? 'This Month' : 'This Year'}</span>
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

            {/* Group-by rows */}
            <div className="px-4 pb-3 border-t border-[#DFE1E6] dark:border-gray-600 pt-2">
              {/* Group by */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-medium text-[#5E6C84] dark:text-gray-400 w-16">Group by</span>
                {(['none', 'project', 'assignee', 'priority', 'type'] as const).map((g) => (
                  <button key={g}
                    onClick={() => { setGroupBy(g); setSubGroupBy('none'); setSubSubGroupBy('none'); }}
                    className={cn(
                      'text-xs px-2 py-0.5 rounded border transition-colors capitalize',
                      groupBy === g
                        ? 'bg-[#0052CC] text-white border-[#0052CC]'
                        : 'border-[#DFE1E6] dark:border-gray-600 text-[#5E6C84] dark:text-gray-400 hover:bg-white dark:hover:bg-gray-700',
                    )}
                  >
                    {g === 'none' ? 'None' : g === 'type' ? 'Type' : g}
                  </button>
                ))}
              </div>

              {/* Sub group */}
              {groupBy !== 'none' && (
                <div className="flex items-center gap-2 flex-wrap mt-2 pt-2 border-t border-[#DFE1E6] dark:border-gray-600">
                  <span className="text-xs font-medium text-[#6554C0] dark:text-purple-400 w-16">Sub</span>
                  {(['none', 'assignee', 'priority', 'type'] as const)
                    .filter(g => g !== groupBy)
                    .map((g) => (
                      <button key={g}
                        onClick={() => { setSubGroupBy(g); setSubSubGroupBy('none'); }}
                        className={cn(
                          'text-xs px-2 py-0.5 rounded border transition-colors capitalize',
                          subGroupBy === g
                            ? 'bg-[#6554C0] text-white border-[#6554C0]'
                            : 'border-[#DFE1E6] dark:border-gray-600 text-[#5E6C84] dark:text-gray-400 hover:bg-white dark:hover:bg-gray-700',
                        )}
                      >
                        {g === 'none' ? 'None' : g === 'type' ? 'Type' : g}
                      </button>
                    ))}
                </div>
              )}

              {/* Sub sub */}
              {subGroupBy !== 'none' && (
                <div className="flex items-center gap-2 flex-wrap mt-2 pt-2 border-t border-[#DFE1E6] dark:border-gray-600">
                  <span className="text-xs font-medium text-[#998DD9] dark:text-purple-300 w-16">Sub sub</span>
                  {(['none', 'priority', 'type'] as const)
                    .filter(g => g !== groupBy && g !== subGroupBy)
                    .map((g) => (
                      <button key={g}
                        onClick={() => setSubSubGroupBy(g)}
                        className={cn(
                          'text-xs px-2 py-0.5 rounded border transition-colors capitalize',
                          subSubGroupBy === g
                            ? 'bg-[#998DD9] text-white border-[#998DD9]'
                            : 'border-[#DFE1E6] dark:border-gray-600 text-[#5E6C84] dark:text-gray-400 hover:bg-white dark:hover:bg-gray-700',
                        )}
                      >
                        {g === 'none' ? 'None' : g === 'type' ? 'Type' : g}
                      </button>
                    ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Board */}
      <div className="flex-1 min-h-0">
        <KanbanBoard
          columns={columns}
          isLoading={isLoading}
          moveCard={moveCard}
          onCardClick={setQuickViewKey}
          onIssueUpdate={() => mutate()}
          swimlanes={swimlanes}
          columnDefs={columnDefs}
          groupBy={groupBy !== 'none' ? groupBy : undefined}
        />
      </div>

      {/* Quick View */}
      <QuickViewPanel issueKey={quickViewKey} onClose={() => setQuickViewKey(null)} />

      {/* Toast */}
      {toast && (
        <div
          className={cn(
            'fixed bottom-6 right-6 z-[60] flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium transition-all',
            toast.type === 'success' ? 'bg-[#36B37E] text-white' : 'bg-red-500 text-white',
          )}
        >
          {toast.type === 'success' ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
          {toast.message}
        </div>
      )}
    </div>
  );
}
