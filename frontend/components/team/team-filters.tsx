'use client';
import { useState, useEffect, useRef } from 'react';
import { Search, X, Users, Filter, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import type { TeamGroup } from '@/types/jira';

export interface TeamFiltersState {
  searchText: string;
  selectedMembers: string[];     // usernames
  memberDisplayNames: Record<string, string>; // username → displayName
  project: string;
  period: 'week' | 'month' | 'custom';
  quickFilter: 'all' | 'under-8h' | 'overdue' | 'off';
  filterStatus: string;          // '' = all, or status name
  filterPriority: string;        // '' = all, or priority name
  filterType: string;            // '' = all, or issuetype name
  filterDueDate: string;         // '' | 'overdue' | 'today' | 'this-week'
  filterHasLog: string;          // '' | 'has-log' | 'no-log'
}

interface TeamFiltersProps {
  groups: TeamGroup[];
  filters: TeamFiltersState;
  onChange: (f: TeamFiltersState) => void;
  allProjects: string[];
  uniqueStatuses: string[];
  uniqueTypes: string[];
}

interface JiraUserResult {
  name: string;
  displayName: string;
}

const selectClass =
  'text-xs border border-[#DFE1E6] dark:border-gray-600 rounded px-2 py-1.5 bg-white dark:bg-gray-800 text-[#172B4D] dark:text-gray-100 focus:outline-none focus:border-[#0052CC] dark:focus:border-blue-400';

const chipLabels: Record<TeamFiltersState['quickFilter'], string> = {
  all: 'Tất cả',
  'under-8h': '⚠️ Thiếu 8h',
  overdue: '⚠️ Quá hạn',
  off: '⚡ Nghỉ/Off',
};

export function TeamFilters({ groups, filters, onChange, allProjects, uniqueStatuses, uniqueTypes }: TeamFiltersProps) {
  const [memberSearch, setMemberSearch] = useState('');
  const [memberResults, setMemberResults] = useState<JiraUserResult[]>([]);
  const [showMemberDropdown, setShowMemberDropdown] = useState(false);
  const [showGroupDropdown, setShowGroupDropdown] = useState(false);
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const memberRef = useRef<HTMLDivElement>(null);
  const groupRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function update(part: Partial<TeamFiltersState>) {
    onChange({ ...filters, ...part });
  }

  // Search users
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (memberSearch.length < 1) {
      setMemberResults([]);
      return;
    }
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

  // Click outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (memberRef.current && !memberRef.current.contains(e.target as Node)) setShowMemberDropdown(false);
      if (groupRef.current && !groupRef.current.contains(e.target as Node)) setShowGroupDropdown(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function addMember(username: string, displayName: string) {
    if (filters.selectedMembers.includes(username)) return;
    update({
      selectedMembers: [...filters.selectedMembers, username],
      memberDisplayNames: { ...filters.memberDisplayNames, [username]: displayName },
    });
    setMemberSearch('');
    setShowMemberDropdown(false);
  }

  function removeMember(username: string) {
    update({
      selectedMembers: filters.selectedMembers.filter(m => m !== username),
    });
  }

  function selectAllMembers() {
    update({ selectedMembers: [] }); // empty = all
    setShowGroupDropdown(false);
  }

  function selectGroup(group: TeamGroup) {
    const names: Record<string, string> = {};
    for (const m of group.members) names[m] = m;
    update({ selectedMembers: group.members, memberDisplayNames: names });
    setShowGroupDropdown(false);
  }

  const isAllMembers = filters.selectedMembers.length === 0;

  return (
    <div className="space-y-2 flex-shrink-0 pb-3 border-b border-[#DFE1E6] dark:border-gray-700">
      {/* Row 1: Member picker + Group shortcut + Period */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Member multi-select */}
        <div className="relative" ref={memberRef}>
          <div className="flex items-center gap-1.5">
            <Users size={14} className="text-[#5E6C84] dark:text-gray-400" />
            <div className="flex items-center flex-wrap gap-1 border border-[#DFE1E6] dark:border-gray-600 rounded bg-white dark:bg-gray-800 min-w-[200px] px-2 py-1 min-h-[30px] cursor-text"
              onClick={() => setShowMemberDropdown(true)}>
              {isAllMembers ? (
                <span className="text-xs text-[#5E6C84] dark:text-gray-400">All Members</span>
              ) : (
                filters.selectedMembers.slice(0, 4).map(m => (
                  <span key={m} className="inline-flex items-center gap-0.5 text-[10px] bg-[#E6F0FF] dark:bg-blue-900/40 text-[#0052CC] dark:text-blue-300 border border-[#0052CC]/20 rounded px-1.5 py-0.5">
                    {filters.memberDisplayNames[m] || m}
                    <button onClick={(e) => { e.stopPropagation(); removeMember(m); }} className="hover:text-red-500">
                      <X size={9} />
                    </button>
                  </span>
                ))
              )}
              {filters.selectedMembers.length > 4 && (
                <span className="text-[10px] text-[#5E6C84]">+{filters.selectedMembers.length - 4} more</span>
              )}
              {!isAllMembers && (
                <button onClick={(e) => { e.stopPropagation(); update({ selectedMembers: [] }); }}
                  className="text-[10px] text-[#5E6C84] hover:text-red-500 ml-auto">clear</button>
              )}
            </div>
          </div>

          {/* Member dropdown */}
          {showMemberDropdown && (
            <div className="absolute top-full left-0 mt-1 w-64 bg-white dark:bg-gray-800 border border-[#DFE1E6] dark:border-gray-600 rounded shadow-lg z-40 max-h-64 overflow-y-auto">
              <div className="p-1.5 border-b border-[#DFE1E6] dark:border-gray-700">
                <input type="text" autoFocus value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  placeholder="Search member..."
                  className="w-full text-xs border border-[#DFE1E6] dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-800 text-[#172B4D] dark:text-gray-100 focus:outline-none focus:border-[#0052CC]" />
              </div>
              {memberSearch.length > 0 ? (
                memberResults.map(u => (
                  <button key={u.name} type="button"
                    onClick={() => addMember(u.name, u.displayName)}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-[#F4F5F7] dark:hover:bg-gray-700 text-[#172B4D] dark:text-gray-200 flex items-center justify-between">
                    <span>{u.displayName}</span>
                    {filters.selectedMembers.includes(u.name) && <span className="text-[#0052CC]">✓</span>}
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
          <button onClick={() => setShowGroupDropdown(!showGroupDropdown)}
            className="text-xs border border-[#DFE1E6] dark:border-gray-600 rounded px-2 py-1.5 bg-white dark:bg-gray-800 text-[#5E6C84] dark:text-gray-400 hover:bg-[#F4F5F7] dark:hover:bg-gray-700 flex items-center gap-1">
            <Users size={11} />
            Groups
            <ChevronDown size={10} />
          </button>
          {showGroupDropdown && (
            <div className="absolute top-full left-0 mt-1 w-48 bg-white dark:bg-gray-800 border border-[#DFE1E6] dark:border-gray-600 rounded shadow-lg z-40">
              <button onClick={selectAllMembers}
                className="w-full text-left px-3 py-2 text-xs hover:bg-[#F4F5F7] dark:hover:bg-gray-700 text-[#172B4D] dark:text-gray-200 border-b border-[#DFE1E6] dark:border-gray-700">
                🌐 All Members
              </button>
              {groups.map(g => (
                <button key={g.id} onClick={() => selectGroup(g)}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-[#F4F5F7] dark:hover:bg-gray-700 text-[#172B4D] dark:text-gray-200 flex items-center justify-between">
                  <span>{g.name}</span>
                  <span className="text-[10px] text-[#5E6C84]">{g.members.length}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Project filter */}
        {allProjects.length > 0 && (
          <div className="flex items-center gap-1.5">
            <Filter size={14} className="text-[#5E6C84] dark:text-gray-400" />
            <select className={cn(selectClass, 'w-36')}
              value={filters.project} onChange={(e) => update({ project: e.target.value })}>
              <option value="">All Projects</option>
              {allProjects.map((p) => (<option key={p} value={p}>{p}</option>))}
            </select>
          </div>
        )}

        {/* Period toggle */}
        <div className="flex items-center rounded border border-[#DFE1E6] dark:border-gray-600 overflow-hidden ml-auto">
          {(['week', 'month', 'custom'] as const).map((p) => (
            <button key={p} type="button" onClick={() => update({ period: p })}
              className={cn('text-xs px-3 py-1.5 font-medium transition-colors capitalize',
                filters.period === p ? 'bg-[#0052CC] text-white' : 'bg-white dark:bg-gray-800 text-[#5E6C84] dark:text-gray-400 hover:bg-[#F4F5F7] dark:hover:bg-gray-700',
                p !== 'custom' ? 'border-r border-[#DFE1E6] dark:border-gray-600' : '')}>
              {p === 'week' ? 'Week' : p === 'month' ? 'Month' : 'Custom'}
            </button>
          ))}
        </div>
      </div>

      {/* Row 2: Search + Quick filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative">
          <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-[#5E6C84] dark:text-gray-500 pointer-events-none" />
          <input type="text" value={filters.searchText}
            onChange={(e) => update({ searchText: e.target.value })}
            placeholder="Search member..."
            className={cn(selectClass, 'pl-6 w-40')} />
          {filters.searchText && (
            <button onClick={() => update({ searchText: '' })}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[#5E6C84] dark:text-gray-400 hover:text-[#172B4D] dark:hover:text-gray-200">
              <X size={12} />
            </button>
          )}
        </div>

        {(['all', 'under-8h', 'overdue', 'off'] as const).map((qf) => (
          <button key={qf} type="button" onClick={() => update({ quickFilter: qf })}
            className={cn('text-xs px-2 py-1 rounded-full border transition-colors font-medium',
              filters.quickFilter === qf ? 'bg-[#0052CC] text-white border-[#0052CC]' : 'border-[#DFE1E6] dark:border-gray-700 text-[#5E6C84] dark:text-gray-400 hover:bg-[#F4F5F7] dark:hover:bg-gray-800')}>
            {chipLabels[qf]}
          </button>
        ))}

        {/* More filters toggle */}
        <button onClick={() => setShowMoreFilters(!showMoreFilters)}
          className={cn('text-xs px-2 py-1 rounded border transition-colors flex items-center gap-1 ml-auto',
            showMoreFilters
              ? 'bg-[#0052CC] text-white border-[#0052CC]'
              : 'border-[#DFE1E6] dark:border-gray-600 text-[#5E6C84] dark:text-gray-400 hover:bg-[#F4F5F7] dark:hover:bg-gray-800')}>
          <Filter size={12} />
          More Filters
          <ChevronDown size={10} className={cn('transition-transform', showMoreFilters && 'rotate-180')} />
        </button>
      </div>

      {/* Row 3: More Filters (collapsible) */}
      {showMoreFilters && (
        <div className="flex items-center gap-3 flex-wrap pt-1">
          {/* Status */}
          {uniqueStatuses.length > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-[#5E6C84] dark:text-gray-500 w-10">Status</span>
              <select className={cn(selectClass, 'w-28')}
                value={filters.filterStatus} onChange={(e) => update({ filterStatus: e.target.value })}>
                <option value="">All</option>
                {uniqueStatuses.map((s) => (<option key={s} value={s}>{s}</option>))}
              </select>
            </div>
          )}

          {/* Priority */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-[#5E6C84] dark:text-gray-500 w-10">Priority</span>
            <select className={cn(selectClass, 'w-24')}
              value={filters.filterPriority} onChange={(e) => update({ filterPriority: e.target.value })}>
              <option value="">All</option>
              {['Highest', 'High', 'Medium', 'Low', 'Lowest', 'Blocker', 'Minor'].map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          {/* Type */}
          {uniqueTypes.length > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-[#5E6C84] dark:text-gray-500 w-10">Type</span>
              <select className={cn(selectClass, 'w-24')}
                value={filters.filterType} onChange={(e) => update({ filterType: e.target.value })}>
                <option value="">All</option>
                {uniqueTypes.map((t) => (<option key={t} value={t}>{t}</option>))}
              </select>
            </div>
          )}

          {/* Due Date */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-[#5E6C84] dark:text-gray-500">Due Date</span>
            <select className={cn(selectClass, 'w-24')}
              value={filters.filterDueDate} onChange={(e) => update({ filterDueDate: e.target.value })}>
              <option value="">All</option>
              <option value="overdue">Overdue</option>
              <option value="today">Today</option>
              <option value="this-week">This Week</option>
            </select>
          </div>

          {/* Has Worklog */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-[#5E6C84] dark:text-gray-500">Log</span>
            <select className={cn(selectClass, 'w-32')}
              value={filters.filterHasLog} onChange={(e) => update({ filterHasLog: e.target.value })}>
              <option value="">All</option>
              <option value="has-log">Has logged time</option>
              <option value="no-log">No logged time</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
}
