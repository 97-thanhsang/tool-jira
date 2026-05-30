'use client';

import { useMemo, useState, Fragment } from 'react';
import { Pencil, Calendar, Clock, Layers, ChevronDown, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { TypeBadge, getStatusBgColor, getStatusColor, getPriorityColor, getPriorityBgColor, getLogBadgeColor, getDuedateColor } from '@/components/worklog/worklog-day-cell';
import { cn } from '@/lib/utils';
import type { WorklogEntry } from '@/types/jira';

interface SubTaskTableProps {
  entries: WorklogEntry[];
  editMode?: boolean;
  onEntryClick?: (entry: WorklogEntry) => void;
}

export function SubTaskTable({ entries, editMode, onEntryClick }: SubTaskTableProps) {
  // Expand/collapse state per parent key
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  function toggleParent(key: string) {
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }));
  }

  // Group entries by parent-task, then by issue key
  const parentGroups = useMemo(() => {
    // First: group by issueKey to aggregate hours per issue
    const issueMap = new Map<string, { entry: WorklogEntry; logSeconds: number }>();
    for (const e of entries) {
      if (issueMap.has(e.issueKey)) {
        issueMap.get(e.issueKey)!.logSeconds += e.timeSpentSeconds;
      } else {
        issueMap.set(e.issueKey, { entry: e, logSeconds: e.timeSpentSeconds });
      }
    }
    const issues = Array.from(issueMap.values())
      .sort((a, b) => a.entry.issueKey.localeCompare(b.entry.issueKey));

    // Group by parentKey
    const groupMap = new Map<string, { parentKey: string; parentSummary: string; issues: typeof issues }>();
    const noParent: typeof issues = [];

    for (const item of issues) {
      const pk = item.entry.parentKey;
      if (pk) {
        if (!groupMap.has(pk)) {
          groupMap.set(pk, {
            parentKey: pk,
            parentSummary: item.entry.parentSummary || pk,
            issues: [],
          });
        }
        groupMap.get(pk)!.issues.push(item);
      } else {
        noParent.push(item);
      }
    }

    const groups = Array.from(groupMap.values())
      .sort((a, b) => a.parentKey.localeCompare(b.parentKey));

    if (noParent.length > 0) {
      groups.push({ parentKey: '', parentSummary: 'No Parent', issues: noParent });
    }

    // Initialize all as expanded
    return groups;
  }, [entries]);

  if (parentGroups.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-[11px] text-[#8993A4] dark:text-gray-500">
        No sub-tasks found
      </div>
    );
  }

  const COL_COUNT = 10;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[11px]">
        <thead>
          <tr className="border-b border-[#DFE1E6] dark:border-gray-700">
            <th className="text-left font-semibold text-[#5E6C84] dark:text-gray-400 uppercase tracking-wide py-1.5 px-1 w-28">Key</th>
            <th className="text-left font-semibold text-[#5E6C84] dark:text-gray-400 uppercase tracking-wide py-1.5 px-1">Summary</th>
            <th className="text-center font-semibold text-[#5E6C84] dark:text-gray-400 uppercase tracking-wide py-1.5 px-1 w-8">Type</th>
            <th className="text-center font-semibold text-[#5E6C84] dark:text-gray-400 uppercase tracking-wide py-1.5 px-1">Status</th>
            <th className="text-center font-semibold text-[#5E6C84] dark:text-gray-400 uppercase tracking-wide py-1.5 px-1 w-12">Start</th>
            <th className="text-center font-semibold text-[#5E6C84] dark:text-gray-400 uppercase tracking-wide py-1.5 px-1 w-12">Due</th>
            <th className="text-center font-semibold text-[#5E6C84] dark:text-gray-400 uppercase tracking-wide py-1.5 px-1 w-12">Est</th>
            <th className="text-center font-semibold text-[#5E6C84] dark:text-gray-400 uppercase tracking-wide py-1.5 px-1 w-14">Log</th>
            <th className="text-left font-semibold text-[#5E6C84] dark:text-gray-400 uppercase tracking-wide py-1.5 px-1">Assignee</th>
            <th className="text-center font-semibold text-[#5E6C84] dark:text-gray-400 uppercase tracking-wide py-1.5 px-1 w-8">Edit</th>
          </tr>
        </thead>
        <tbody>
          {parentGroups.map(group => {
            const groupKey = group.parentKey || '__no_parent__';
            const isOpen = expanded[groupKey] !== false; // default expanded
            const groupTotalHours = group.issues.reduce((s, i) => s + i.logSeconds / 3600, 0);
            return (
              <Fragment key={groupKey}>
                {/* Parent header row — colSpan toàn bộ */}
                <tr
                  className="bg-[#FAFBFC] dark:bg-gray-800/80 border-b border-[#DFE1E6] dark:border-gray-700 cursor-pointer hover:bg-[#F4F5F7] dark:hover:bg-gray-700/80 transition-colors"
                  onClick={() => toggleParent(groupKey)}
                >
                  <td colSpan={COL_COUNT} className="py-1.5 px-2">
                    <div className="flex items-center gap-2">
                      {isOpen ? <ChevronDown size={12} className="text-[#5E6C84]" /> : <ChevronRight size={12} className="text-[#5E6C84]" />}
                      <Layers size={12} className="text-[#5E6C84] dark:text-gray-400 flex-shrink-0" />
                      {group.parentKey ? (
                        <>
                          <span className="text-[11px] font-semibold text-[#0052CC] dark:text-blue-400">{group.parentKey}</span>
                          <span className="text-[10px] text-[#5E6C84] dark:text-gray-400 truncate">{group.parentSummary}</span>
                        </>
                      ) : (
                        <span className="text-[11px] text-[#5E6C84] dark:text-gray-400 italic">Sub-tasks without parent</span>
                      )}
                      <span className="ml-auto text-[10px] text-[#5E6C84] dark:text-gray-400 font-medium">{group.issues.length} sub-task(s)</span>
                      <span className="text-[10px] font-bold text-[#172B4D] dark:text-gray-200">{groupTotalHours.toFixed(1)}h</span>
                    </div>
                  </td>
                </tr>
                {/* Sub-task rows — hidden when collapsed */}
                {isOpen && group.issues.map(({ entry: e, logSeconds }) => {
                  const estH = e.estSeconds > 0 ? (e.estSeconds / 3600).toFixed(1) : null;
                  const logH = (logSeconds / 3600).toFixed(1);
                  const logColor = getLogBadgeColor(logSeconds, e.estSeconds);
                  return (
                    <tr key={e.issueKey} className="border-b border-[#F4F5F7] dark:border-gray-700/50 hover:bg-[#FAFBFC] dark:hover:bg-gray-800/50 transition-colors">
                      {/* Key */}
                      <td className="py-1.5 px-1 w-28">
                        <button
                          onClick={() => onEntryClick?.(e)}
                          className="font-semibold text-[#0052CC] dark:text-blue-400 hover:underline text-left text-[10px]"
                        >
                          {e.issueKey}
                        </button>
                      </td>
                      {/* Summary */}
                      <td className="py-1.5 px-1">
                        <span className="text-[#5E6C84] dark:text-gray-400 whitespace-nowrap" title={e.issueSummary}>
                          {e.issueSummary}
                        </span>
                      </td>
                      {/* Type */}
                      <td className="py-1.5 px-1 text-center">
                        <div className="inline-flex items-center justify-center">
                          <TypeBadge typeName={e.issueTypeName} iconUrl={e.issueTypeIconUrl} />
                        </div>
                      </td>
                      {/* Status */}
                      <td className="py-1.5 px-1 text-center">
                        {e.status && (
                          <span className="text-[9px] px-1.5 py-[1px] rounded font-medium"
                            style={{ backgroundColor: getStatusBgColor(e.status), color: getStatusColor(e.status) }}>
                            {e.status}
                          </span>
                        )}
                      </td>
                      {/* Start date */}
                      <td className="py-1.5 px-1 text-center">
                        <span className="inline-flex items-center gap-0.5 text-[10px] text-[#8993A4] dark:text-gray-500">
                          <Clock size={8} />{format(new Date(e.started), 'dd/MM')}
                        </span>
                      </td>
                      {/* Due date */}
                      <td className="py-1.5 px-1 text-center">
                        {e.duedate ? (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-medium"
                            style={{ color: getDuedateColor(e.status, e.duedate) }}>
                            <Calendar size={8} />{format(new Date(e.duedate + 'T12:00:00'), 'dd/MM')}
                          </span>
                        ) : (
                          <span className="text-[10px] text-[#C1C7D0]">—</span>
                        )}
                      </td>
                      {/* Est */}
                      <td className="py-1.5 px-1 text-center">
                        {estH != null ? (
                          <span className="text-[10px] text-[#8993A4] dark:text-gray-500">{estH}h</span>
                        ) : (
                          <span className="text-[10px] text-[#C1C7D0]">—</span>
                        )}
                      </td>
                      {/* Log */}
                      <td className="py-1.5 px-1 text-center">
                        <span className="font-bold px-1.5 py-[1px] rounded text-[10px]"
                          style={{ backgroundColor: logColor.bg, color: logColor.fg }}>
                          {logH}h
                        </span>
                      </td>
                      {/* Assignee */}
                      <td className="py-1.5 px-1">
                        <span className="text-[10px] text-[#5E6C84] dark:text-gray-400 truncate block max-w-[80px]">
                          {e.author?.displayName || e.author?.name || '—'}
                        </span>
                      </td>
                      {/* Edit */}
                      <td className="py-1.5 px-1 text-center">
                        {editMode ? (
                          <button
                            onClick={() => onEntryClick?.(e)}
                            className="text-[#5E6C84] hover:text-[#0052CC] transition-colors p-0.5"
                            title="Edit worklog"
                          >
                            <Pencil size={9} />
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
