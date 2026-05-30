'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import type { WorklogEntry } from '@/types/jira';

interface ProjectStat {
  projectKey: string;
  projectName: string;
  totalHours: number;
  issueCount: number;
  entryCount: number;
}

interface ProjectStatsPanelProps {
  entries: WorklogEntry[];
  selectedProject: string | null;
  onSelectProject: (projectKey: string | null) => void;
}

export function ProjectStatsPanel({ entries, selectedProject, onSelectProject }: ProjectStatsPanelProps) {
  const stats = useMemo(() => {
    const map = new Map<string, ProjectStat>();
    const seenIssues = new Set<string>();

    for (const e of entries) {
      if (!map.has(e.projectKey)) {
        map.set(e.projectKey, {
          projectKey: e.projectKey,
          projectName: e.projectName,
          totalHours: 0,
          issueCount: 0,
          entryCount: 0,
        });
      }
      const stat = map.get(e.projectKey)!;
      stat.totalHours += e.timeSpentSeconds / 3600;
      stat.entryCount++;
      const issueKey = e.issueKey;
      if (!seenIssues.has(issueKey)) {
        seenIssues.add(issueKey);
        stat.issueCount++;
      }
    }

    return Array.from(map.values()).sort((a, b) => b.totalHours - a.totalHours);
  }, [entries]);

  const allTotal = useMemo(() => stats.reduce((s, st) => s + st.totalHours, 0), [stats]);

  return (
    <div className="space-y-1">
      {/* Summary line */}
      <div className="flex items-center justify-between px-1 mb-2">
        <span className="text-[11px] font-semibold text-[#5E6C84] dark:text-gray-400 uppercase tracking-wide">Projects</span>
        <span className="text-[10px] text-[#5E6C84] dark:text-gray-400 font-medium">{stats.length} projects · {allTotal.toFixed(1)}h</span>
      </div>

      {/* All projects entry */}
      <button
        onClick={() => onSelectProject(null)}
        className={cn(
          'w-full flex items-center justify-between px-3 py-2 rounded text-[12px] transition-colors text-left border',
          !selectedProject
            ? 'bg-[#0052CC]/10 text-[#0052CC] dark:bg-blue-900/20 dark:text-blue-400 font-semibold border-[#0052CC]/30 dark:border-blue-800'
            : 'text-[#172B4D] dark:text-gray-200 hover:bg-[#F4F5F7] dark:hover:bg-gray-700 border-transparent',
        )}
      >
        <span className="flex items-center gap-2 font-medium">
          <span className="text-base">📋</span>
          <span>All Projects</span>
        </span>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-[#8993A4] font-medium">{stats.reduce((s, st) => s + st.issueCount, 0)} issues</span>
          <span className="text-[12px] font-bold text-[#172B4D] dark:text-gray-100">{allTotal.toFixed(1)}h</span>
        </div>
      </button>

      {/* Individual project entries */}
      {stats.map(stat => {
        const isSelected = selectedProject === stat.projectKey;
        return (
          <button
            key={stat.projectKey}
            onClick={() => onSelectProject(isSelected ? null : stat.projectKey)}
            className={cn(
              'w-full flex items-center justify-between px-3 py-2.5 rounded text-[12px] transition-colors text-left border',
              isSelected
                ? 'bg-[#0052CC]/10 text-[#0052CC] dark:bg-blue-900/20 dark:text-blue-400 font-semibold border-[#0052CC]/30 dark:border-blue-800'
                : 'text-[#172B4D] dark:text-gray-200 hover:bg-[#F4F5F7] dark:hover:bg-gray-700 border-transparent',
            )}
          >
            <span className="flex items-center gap-2 min-w-0">
              <span className="w-3 h-3 rounded-full flex-shrink-0 border-2 border-white dark:border-gray-800 shadow-sm" style={{ backgroundColor: stat.projectKey === 'HLU2' ? '#0052CC' : stat.projectKey === 'HUBONG01' ? '#36B37E' : stat.projectKey === 'EMSPRO2' ? '#FF8B00' : '#6554C0' }} />
              <span className="font-medium truncate">{stat.projectName || stat.projectKey}</span>
            </span>
            <div className="flex items-center gap-3 flex-shrink-0">
              <span className="text-[10px] text-[#8993A4]">{stat.issueCount} issue{stat.issueCount !== 1 ? 's' : ''}</span>
              <span className="text-[11px] font-bold text-[#172B4D] dark:text-gray-100">{stat.totalHours.toFixed(1)}h</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
