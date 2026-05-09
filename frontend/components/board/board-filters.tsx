'use client';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { JiraIssue } from '@/types/jira';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BoardFilters {
  projects:    string[];
  issueTypes:  string[];
  priorities:  string[];
}

export const EMPTY_FILTERS: BoardFilters = {
  projects:   [],
  issueTypes: [],
  priorities: [],
};

/** Apply filters client-side on already-fetched issues */
export function applyFilters(issues: JiraIssue[], filters: BoardFilters): JiraIssue[] {
  return issues.filter((issue) => {
    if (filters.projects.length   > 0 && !filters.projects.includes(issue.fields.project.key))     return false;
    if (filters.issueTypes.length > 0 && !filters.issueTypes.includes(issue.fields.issuetype.name)) return false;
    if (filters.priorities.length > 0 && !filters.priorities.includes(issue.fields.priority.name))  return false;
    return true;
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

interface BoardFilterBarProps {
  filters:   BoardFilters;
  onChange:  (filters: BoardFilters) => void;
  allIssues: JiraIssue[];
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label:   string;
  active:  boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
        active
          ? 'bg-[#0052CC] text-white border-[#0052CC]'
          : 'border-[#DFE1E6] dark:border-gray-700 text-[#5E6C84] dark:text-gray-400 hover:bg-[#F4F5F7] dark:hover:bg-gray-800'
      }`}
    >
      {label}
    </button>
  );
}

export function BoardFilterBar({ filters, onChange, allIssues }: BoardFilterBarProps) {
  const projects   = Array.from(new Set(allIssues.map((i) => i.fields.project.key)));
  const issueTypes = Array.from(new Set(allIssues.map((i) => i.fields.issuetype.name)));
  const priorities = Array.from(new Set(allIssues.map((i) => i.fields.priority.name)));

  const hasFilters =
    filters.projects.length > 0 ||
    filters.issueTypes.length > 0 ||
    filters.priorities.length > 0;

  function toggle(field: keyof BoardFilters, value: string) {
    const current = filters[field];
    const next    = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    onChange({ ...filters, [field]: next });
  }

  if (allIssues.length === 0) return null;

  return (
    <div className="flex items-center gap-3 flex-wrap pb-3 border-b border-[#DFE1E6] dark:border-gray-700 mb-4 flex-shrink-0">
      {/* Project */}
      {projects.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-medium text-[#5E6C84] dark:text-gray-400">Project:</span>
          {projects.map((p) => (
            <FilterChip
              key={p}
              label={p}
              active={filters.projects.includes(p)}
              onClick={() => toggle('projects', p)}
            />
          ))}
        </div>
      )}

      {/* Type */}
      {issueTypes.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-medium text-[#5E6C84] dark:text-gray-400">Type:</span>
          {issueTypes.map((t) => (
            <FilterChip
              key={t}
              label={t}
              active={filters.issueTypes.includes(t)}
              onClick={() => toggle('issueTypes', t)}
            />
          ))}
        </div>
      )}

      {/* Priority */}
      {priorities.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-medium text-[#5E6C84] dark:text-gray-400">Priority:</span>
          {priorities.map((p) => (
            <FilterChip
              key={p}
              label={p}
              active={filters.priorities.includes(p)}
              onClick={() => toggle('priorities', p)}
            />
          ))}
        </div>
      )}

      {/* Clear */}
      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onChange(EMPTY_FILTERS)}
          className="h-6 px-2 text-xs text-[#5E6C84] dark:text-gray-400 hover:text-[#172B4D] dark:hover:text-gray-200"
        >
          <X size={12} className="mr-1" />
          Clear
        </Button>
      )}
    </div>
  );
}
