import type { JiraIssue } from '@/types/jira';
import { IssueCard } from './issue-card';
import { Skeleton } from '@/components/ui/skeleton';

interface Column {
  id: string;
  label: string;
  issues: JiraIssue[];
  color: string;
}

interface KanbanBoardProps {
  columns: Column[];
  isLoading: boolean;
}

function ColumnSkeleton() {
  return (
    <div className="space-y-2">
      {[1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-24 w-full rounded-sm" />
      ))}
    </div>
  );
}

export function KanbanBoard({ columns, isLoading }: KanbanBoardProps) {
  return (
    <div className="grid grid-cols-3 gap-4 h-full">
      {columns.map((col) => (
        <div key={col.id} className="flex flex-col min-h-0">
          {/* Column header */}
          <div className="flex items-center gap-2 mb-3 px-1 flex-shrink-0">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: col.color }}
            />
            <h3 className="text-xs font-semibold text-[#5E6C84] uppercase tracking-wider">
              {col.label}
            </h3>
            <span className="ml-auto text-xs text-[#5E6C84] bg-[#DFE1E6] px-1.5 py-0.5 rounded-full">
              {col.issues.length}
            </span>
          </div>

          {/* Cards */}
          <div className="flex-1 space-y-2 overflow-y-auto pr-1">
            {isLoading ? (
              <ColumnSkeleton />
            ) : col.issues.length === 0 ? (
              <div className="text-center py-8 text-xs text-[#5E6C84]">
                No issues
              </div>
            ) : (
              col.issues.map((issue) => (
                <IssueCard key={issue.id} issue={issue} />
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
