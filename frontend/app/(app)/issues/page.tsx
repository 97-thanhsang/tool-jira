'use client';

import { useState, useEffect, useRef } from 'react';
import { useIssuesList } from '@/hooks/use-issues-list';
import type { IssueFilters } from '@/hooks/use-issues-list';
import { IssuesTable } from '@/components/issues/issues-table';
import { FilterPanel } from '@/components/issues/filter-panel';
import { api } from '@/lib/api';
import { Users, X, ChevronDown } from 'lucide-react';
import type { TeamGroup } from '@/types/jira';

// ─── Types ────────────────────────────────────────────────────────

interface JiraUserResult {
  name: string;
  displayName: string;
}

// ─── Default groups ────────────────────────────────────────────────

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

export default function IssuesPage() {
  const [filters, setFilters] = useState<IssueFilters>({});
  const [sortField, setSortField] = useState('updated');
  const [sortDir, setSortDir] = useState<'ASC' | 'DESC'>('DESC');

  // ── Group / member filter state ──
  const [groups] = useState<TeamGroup[]>(defaultGroups);
  const [selectedMembers, setSelectedMembers] = useState<string[]>(
    () => defaultGroups[0]?.members ?? [],
  );
  const [memberDisplayNames, setMemberDisplayNames] = useState<Record<string, string>>(
    () => {
      const names: Record<string, string> = {};
      for (const m of defaultGroups[0]?.members ?? []) names[m] = m;
      return names;
    },
  );
  const [memberSearch, setMemberSearch] = useState('');
  const [memberResults, setMemberResults] = useState<JiraUserResult[]>([]);
  const [showMemberDropdown, setShowMemberDropdown] = useState(false);
  const [showGroupDropdown, setShowGroupDropdown] = useState(false);
  const memberRef = useRef<HTMLDivElement>(null);
  const groupRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Debounced member search ──
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
      } catch {
        setMemberResults([]);
      }
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [memberSearch]);

  // ── Click outside closes dropdowns ──
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

  // ── Group / member helpers ──
  function addMember(username: string, displayName: string) {
    if (selectedMembers.includes(username)) return;
    setSelectedMembers((prev) => [...prev, username]);
    setMemberDisplayNames((prev) => ({ ...prev, [username]: displayName }));
    setMemberSearch('');
    setShowMemberDropdown(false);
  }

  function removeMember(username: string) {
    setSelectedMembers((prev) => prev.filter((m) => m !== username));
  }

  function selectAllMembers() {
    setSelectedMembers([]);
    setShowGroupDropdown(false);
  }

  function selectGroup(group: TeamGroup) {
    const names: Record<string, string> = {};
    for (const m of group.members) names[m] = m;
    setSelectedMembers(group.members);
    setMemberDisplayNames((prev) => ({ ...prev, ...names }));
    setShowGroupDropdown(false);
  }

  const isAllMembers = selectedMembers.length === 0;

  const { issues, total, isLoading, error, mutate } = useIssuesList({
    ...filters,
    sortField,
    sortDir,
    ...(selectedMembers.length > 0
      ? { assigneeIn: selectedMembers }
      : { assignee: 'currentUser()' }),
  });

  function handleSortChange(field: string, dir: 'ASC' | 'DESC') {
    setSortField(field);
    setSortDir(dir);
  }

  // Listen for bulk transition events → mutate
  useEffect(() => {
    const handler = () => { mutate(); };
    window.addEventListener('issues-bulk-transitioned', handler);
    return () => window.removeEventListener('issues-bulk-transitioned', handler);
  }, [mutate]);

  function updateFilters(newFilters: Partial<IssueFilters>) {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  }

  function clearFilters() {
    setFilters({});
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <h1 className="text-xl font-semibold text-[#172B4D] dark:text-gray-100">
          Issues
        </h1>
        {!isLoading && (
          <span className="text-xs bg-[#DFE1E6] dark:bg-gray-700 text-[#42526E] dark:text-gray-300 px-2 py-0.5 rounded-full font-medium">
            {total}
          </span>
        )}
      </div>

      {error ? (
        <div className="flex items-center justify-center py-16">
          <p className="text-sm text-red-600">
            Failed to load issues. Please try again.
          </p>
        </div>
      ) : (
        <>
          {/* ── Group / Member filter row ── */}
            <div className="flex items-center gap-3 mb-4 pb-3 border-b border-[#DFE1E6] dark:border-gray-700 flex-wrap">
              {/* Member multi-select */}
              <div className="relative" ref={memberRef}>
                <div className="flex items-center gap-1.5">
                  <Users size={14} className="text-[#5E6C84] dark:text-gray-400" />
                  <div
                    className="flex items-center flex-wrap gap-1 border border-[#DFE1E6] dark:border-gray-600 rounded bg-white dark:bg-gray-800 min-w-[200px] px-2 py-1 min-h-[30px] cursor-text"
                    onClick={() => setShowMemberDropdown(true)}
                  >
                    {isAllMembers ? (
                      <span className="text-xs text-[#5E6C84] dark:text-gray-400">
                        All Members
                      </span>
                    ) : (
                      <>
                        {selectedMembers.slice(0, 4).map((m) => (
                          <span
                            key={m}
                            className="inline-flex items-center gap-0.5 text-[10px] bg-[#E6F0FF] dark:bg-blue-900/40 text-[#0052CC] dark:text-blue-300 border border-[#0052CC]/20 rounded px-1.5 py-0.5"
                          >
                            {memberDisplayNames[m] || m}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                removeMember(m);
                              }}
                              className="hover:text-red-500"
                            >
                              <X size={9} />
                            </button>
                          </span>
                        ))}
                        {selectedMembers.length > 4 && (
                          <span className="text-[10px] text-[#5E6C84]">
                            +{selectedMembers.length - 4} more
                          </span>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedMembers([]);
                          }}
                          className="text-[10px] text-[#5E6C84] hover:text-red-500 ml-auto"
                        >
                          clear
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Member search dropdown */}
                {showMemberDropdown && (
                  <div className="absolute top-full left-0 mt-1 w-64 bg-white dark:bg-gray-800 border border-[#DFE1E6] dark:border-gray-600 rounded shadow-lg z-40 max-h-64 overflow-y-auto">
                    <div className="p-1.5 border-b border-[#DFE1E6] dark:border-gray-700">
                      <input
                        type="text"
                        autoFocus
                        value={memberSearch}
                        onChange={(e) => setMemberSearch(e.target.value)}
                        placeholder="Search member..."
                        className="w-full text-xs border border-[#DFE1E6] dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-800 text-[#172B4D] dark:text-gray-100 focus:outline-none focus:border-[#0052CC]"
                      />
                    </div>
                    {memberSearch.length > 0 ? (
                      memberResults.map((u) => (
                        <button
                          key={u.name}
                          type="button"
                          onClick={() => addMember(u.name, u.displayName)}
                          className="w-full text-left px-3 py-2 text-xs hover:bg-[#F4F5F7] dark:hover:bg-gray-700 text-[#172B4D] dark:text-gray-200 flex items-center justify-between"
                        >
                          <span>{u.displayName}</span>
                          {selectedMembers.includes(u.name) && (
                            <span className="text-[#0052CC]">✓</span>
                          )}
                        </button>
                      ))
                    ) : (
                      <p className="text-xs text-[#5E6C84] px-3 py-4 text-center">
                        Type to search members
                      </p>
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
                    <button
                      onClick={selectAllMembers}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-[#F4F5F7] dark:hover:bg-gray-700 text-[#172B4D] dark:text-gray-200 border-b border-[#DFE1E6] dark:border-gray-700"
                    >
                      🌐 All Members
                    </button>
                    {groups.map((g) => (
                      <button
                        key={g.id}
                        onClick={() => selectGroup(g)}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-[#F4F5F7] dark:hover:bg-gray-700 text-[#172B4D] dark:text-gray-200 flex items-center justify-between"
                      >
                        <span>{g.name}</span>
                        <span className="text-[10px] text-[#5E6C84]">{g.members.length}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <FilterPanel
              filters={filters}
              onUpdate={updateFilters}
              onClear={clearFilters}
            />
            <IssuesTable
              issues={issues}
              total={total}
              isLoading={isLoading}
              sortField={sortField}
              sortDir={sortDir}
              onSortChange={handleSortChange}
              onIssueUpdate={() => mutate()}
            />
          </>
        )}
    </div>
  );
}
