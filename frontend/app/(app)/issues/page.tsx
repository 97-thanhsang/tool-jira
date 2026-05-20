'use client';

import { useState, useEffect } from 'react';
import { useIssuesList } from '@/hooks/use-issues-list';
import type { IssueFilters } from '@/hooks/use-issues-list';
import { IssuesTable } from '@/components/issues/issues-table';
import { FilterBar } from '@/components/shared/filter-bar';
import type { UnifiedFilters } from '@/lib/filter-constants';
import { DEFAULT_GROUPS, MEMBER_DISPLAY_NAMES } from '@/lib/team-constants';
import { GroupSelector } from '@/components/shared/group-selector';
import { GroupByControls } from '@/components/shared/group-by-controls';
import type { TeamGroup } from '@/types/jira';

// ─── Adapters: IssueFilters ↔ UnifiedFilters ─────────────────────────────────

function issueToUnified(f: IssueFilters): UnifiedFilters {
  return {
    searchText: f.text ?? '',
    projectIn: f.projectIn,
    issuetypeIn: f.issuetypeIn,
    issuetypeExclude: f.issuetypeExclude,
    statusIn: f.statusIn,
    statusExclude: f.statusExclude,
    priorityIn: f.priorityIn,
    priorityExclude: f.priorityExclude,
    assigneeIn: f.assigneeIn,
    sprintIn: f.sprintIn,
    reporterIn: f.reporterIn,
  };
}

function unifiedToIssue(u: UnifiedFilters): Partial<IssueFilters> {
  return {
    text: u.searchText || undefined,
    projectIn: u.projectIn, projectExclude: u.projectExclude,
    issuetypeIn: u.issuetypeIn, issuetypeExclude: u.issuetypeExclude,
    statusIn: u.statusIn, statusExclude: u.statusExclude,
    priorityIn: u.priorityIn, priorityExclude: u.priorityExclude,
    assigneeIn: u.assigneeIn, assigneeExclude: u.assigneeExclude,
    sprintIn: u.sprintIn, sprintExclude: u.sprintExclude,
    reporterIn: u.reporterIn, reporterExclude: u.reporterExclude,
  };
}

export default function IssuesPage() {
  const [filters, setFilters] = useState<IssueFilters>({});
  const [sortField, setSortField] = useState('updated');
  const [sortDir, setSortDir] = useState<'ASC' | 'DESC'>('DESC');

  // ── Group / member filter state ──
  const [groups] = useState<TeamGroup[]>(DEFAULT_GROUPS);
  const [selectedMembers, setSelectedMembers] = useState<string[]>(
    () => DEFAULT_GROUPS[0]?.members ?? [],
  );
  const [memberDisplayNames, setMemberDisplayNames] = useState<Record<string, string>>(
    () => {
      const names: Record<string, string> = {};
      for (const m of DEFAULT_GROUPS[0]?.members ?? []) names[m] = MEMBER_DISPLAY_NAMES[m] || m;
      return names;
    },
  );
  // ── Group-by controls state ──
  const [groupBy, setGroupBy] = useState<string>('none');
  const [subGroupBy, setSubGroupBy] = useState<string>('none');
  const [subSubGroupBy, setSubSubGroupBy] = useState<string>('none');
  // ── Group / member helpers ──
  function addMember(username: string, displayName: string) {
    if (selectedMembers.includes(username)) return;
    setSelectedMembers((prev) => [...prev, username]);
    setMemberDisplayNames((prev) => ({ ...prev, [username]: displayName }));
  }

  function removeMember(username: string) {
    setSelectedMembers((prev) => prev.filter((m) => m !== username));
  }

  function selectAllMembers() {
    setSelectedMembers([]);
  }

  function selectGroup(group: TeamGroup) {
    const names: Record<string, string> = {};
    for (const m of group.members) names[m] = MEMBER_DISPLAY_NAMES[m] || m;
    setSelectedMembers(group.members);
    setMemberDisplayNames((prev) => ({ ...prev, ...names }));
  }

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

      <GroupSelector
        groups={groups}
        selectedMembers={selectedMembers}
        memberDisplayNames={memberDisplayNames}
        onAddMember={addMember}
        onRemoveMember={removeMember}
        onSelectGroup={selectGroup}
        onSelectAllMembers={selectAllMembers}
      />

      <GroupByControls
        groupBy={groupBy}
        subGroupBy={subGroupBy}
        subSubGroupBy={subSubGroupBy}
        onGroupByChange={setGroupBy}
        onSubGroupByChange={setSubGroupBy}
        onSubSubGroupByChange={setSubSubGroupBy}
        groupByOptions={['none', 'project', 'assignee', 'priority', 'type', 'parent', 'status', 'sprint', 'statusCategory', 'reporter']}
        subSubGroupByOptions={['none', 'priority', 'type', 'status', 'sprint']}
      />

      {error ? (
        <div className="flex items-center justify-center py-16">
          <p className="text-sm text-red-600">
            Failed to load issues. Please try again.
          </p>
        </div>
      ) : (
        <>
            <FilterBar
              filters={issueToUnified(filters)}
              onChange={(u) => setFilters(prev => ({ ...prev, ...unifiedToIssue(u) }))}
              period={{
                options: [
                  { key: 'today', label: 'Today' },
                  { key: 'week', label: 'Week' },
                  { key: 'month', label: 'Month' },
                  { key: 'year', label: 'Year' },
                ],
                active: filters.period as string | undefined,
                onChange: (key) => setFilters(prev => ({ ...prev, period: key })),
              }}
              quickPills={[
                { key: 'onlyMyIssues', label: 'Only My Issues', active: !!filters.onlyMyIssues, onToggle: () => setFilters(prev => ({ ...prev, onlyMyIssues: !prev.onlyMyIssues })) },
                { key: 'recentlyUpdated', label: 'Recently Updated', active: !!filters.recentlyUpdated, onToggle: () => setFilters(prev => ({ ...prev, recentlyUpdated: !prev.recentlyUpdated })) },
                { key: 'dueThisWeek', label: 'Due This Week', active: !!filters.dueThisWeek, onToggle: () => setFilters(prev => ({ ...prev, dueThisWeek: !prev.dueThisWeek })) },
                { key: 'highPriority', label: 'High Priority', active: !!filters.highPriority, onToggle: () => setFilters(prev => ({ ...prev, highPriority: !prev.highPriority })) },
              ]}
            />
            <IssuesTable
              issues={issues}
              total={total}
              isLoading={isLoading}
              sortField={sortField}
              sortDir={sortDir}
              onSortChange={handleSortChange}
              onIssueUpdate={() => mutate()}
              groupBy={groupBy}
              subGroupBy={subGroupBy}
              subSubGroupBy={subSubGroupBy}
            />
          </>
        )}
    </div>
  );
}
