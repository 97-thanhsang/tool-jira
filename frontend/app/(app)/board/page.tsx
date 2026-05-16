'use client';
import { useState, useEffect, useRef, useMemo } from 'react';
import { api, getStoredUser } from '@/lib/api';
import { RefreshCw, CheckCircle2, XCircle, Users, ChevronDown, X } from 'lucide-react';
import { useBoardState } from '@/hooks/use-board-state';
import { useStatusColumns } from '@/hooks/use-status-columns';
import { KanbanBoard, type BoardColumn } from '@/components/board/kanban-board';
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
    for (const m of group.members) names[m] = m;
    setSelectedMembers(group.members);
    setMemberDisplayNames(prev => ({ ...prev, ...names }));
    setShowGroupDropdown(false);
  }

  const isAllMembers = selectedMembers.length === 0;

  // effectiveFilters: filters from BoardFilterBar only (groups handled via JQL)
  const effectiveFilters = filters;

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
                <span className="text-xs text-[#5E6C84] dark:text-gray-400">All Members</span>
              ) : (
                <>
                  {selectedMembers.slice(0, 4).map(m => (
                    <span key={m} className="inline-flex items-center gap-0.5 text-[10px] bg-[#E6F0FF] dark:bg-blue-900/40 text-[#0052CC] dark:text-blue-300 border border-[#0052CC]/20 rounded px-1.5 py-0.5">
                      {memberDisplayNames[m] || m}
                      <button onClick={e => { e.stopPropagation(); removeMember(m); }} className="hover:text-red-500">
                        <X size={9} />
                      </button>
                    </span>
                  ))}
                  {selectedMembers.length > 4 && (
                    <span className="text-[10px] text-[#5E6C84]">+{selectedMembers.length - 4} more</span>
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
                <input
                  type="text"
                  autoFocus
                  value={memberSearch}
                  onChange={e => setMemberSearch(e.target.value)}
                  placeholder="Search member..."
                  className="w-full text-xs border border-[#DFE1E6] dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-800 text-[#172B4D] dark:text-gray-100 focus:outline-none focus:border-[#0052CC]"
                />
              </div>
              {memberSearch.length > 0 ? (
                memberResults.map(u => (
                  <button
                    key={u.name}
                    type="button"
                    onClick={() => addMember(u.name, u.displayName)}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-[#F4F5F7] dark:hover:bg-gray-700 text-[#172B4D] dark:text-gray-200 flex items-center justify-between"
                  >
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

      {/* ── Filter bar ── */}
      <BoardFilterBar filters={filters} onChange={setFilters} />

      {/* Board */}
      <div className="flex-1 min-h-0">
        <KanbanBoard
          columns={columns}
          isLoading={isLoading}
          moveCard={moveCard}
          onCardClick={setQuickViewKey}
          onIssueUpdate={() => mutate()}
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
