'use client';

import { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ProjectStatsPanel } from '@/components/worklog/project-stats-panel';
import { SubTaskTable } from '@/components/worklog/subtask-table';
import type { WorklogEntry } from '@/types/jira';

interface GroupDetailPanelProps {
  entries: WorklogEntry[];
  editMode?: boolean;
  onEntryClick?: (entry: WorklogEntry) => void;
}

export function GroupDetailPanel({ entries, editMode, onEntryClick }: GroupDetailPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);

  // Filter entries by selected project
  const filteredEntries = useMemo(() => {
    if (!selectedProject) return entries;
    return entries.filter(e => e.projectKey === selectedProject);
  }, [entries, selectedProject]);

  if (entries.length === 0) return null;

  return (
    <div className="border-b border-[#DFE1E6] dark:border-gray-700">
      {/* Toggle header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-1.5 px-3 py-1 text-[10px] text-[#5E6C84] dark:text-gray-400 hover:bg-[#F4F5F7] dark:hover:bg-gray-700 transition-colors text-left font-medium"
      >
        {isOpen ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
        <Layers size={11} />
        <span>Project Detail</span>
      </button>

      {/* Detail panel */}
      {isOpen && (
        <div className="grid grid-cols-[260px_1fr] gap-0 border-t border-[#DFE1E6] dark:border-gray-700">
          {/* Left: Project Stats */}
          <div className="border-r border-[#DFE1E6] dark:border-gray-700 p-2 overflow-y-auto max-h-[300px] bg-[#FAFBFC] dark:bg-gray-800/50">
            <ProjectStatsPanel
              entries={entries}
              selectedProject={selectedProject}
              onSelectProject={setSelectedProject}
            />
          </div>
          {/* Right: Sub-task Table */}
          <div className="p-2 overflow-x-auto overflow-y-auto max-h-[300px]">
            <SubTaskTable
              entries={filteredEntries}
              editMode={editMode}
              onEntryClick={onEntryClick}
            />
          </div>
        </div>
      )}
    </div>
  );
}
