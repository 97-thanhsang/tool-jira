'use client';
import { useMemo, useState } from 'react';
import { format, isToday } from 'date-fns';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Settings2, GripVertical, Eye, EyeOff } from 'lucide-react';
import type { TeamReportData, UserReport, TaskReport } from '@/types/jira';

interface TeamReportTableProps {
  data: TeamReportData;
  searchText: string;
  quickFilter: 'all' | 'under-8h' | 'overdue' | 'off';
}

function getHourClass(seconds: number): string {
  if (seconds >= 28800) return 'text-[#36B37E] dark:text-green-400 font-semibold';
  if (seconds > 0) return 'text-[#172B4D] dark:text-gray-200';
  return 'text-[#C1C7D0] dark:text-gray-600';
}

function formatCellHours(seconds: number): string {
  if (seconds === 0) return '-';
  const h = seconds / 3600;
  return `${h % 1 === 0 ? h.toFixed(0) : h.toFixed(1)}h`;
}

export function TeamReportTable({ data, searchText, quickFilter }: TeamReportTableProps) {
  const [configOpen, setConfigOpen] = useState(false);
  const [columnOrder, setColumnOrder] = useState(['project', 'key', 'summary', 'est']);
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({
    project: true, key: true, summary: true, est: true,
  });
  // Compute day columns from date range
  const days = useMemo(() => {
    const result: string[] = [];
    const from = new Date(data.dateRange.from);
    const to = new Date(data.dateRange.to);
    const cur = new Date(from);
    while (cur <= to) {
      result.push(format(cur, 'yyyy-MM-dd'));
      cur.setDate(cur.getDate() + 1);
    }
    return result;
  }, [data.dateRange]);

  const dayHeaders = useMemo(() => days.map((d) => ({
    key: d,
    label: format(new Date(d), 'EEE d'),
    isToday: isToday(new Date(d)),
  })), [days]);

  // Filter users by search text and quick filter
  const filteredUsers = useMemo(() => {
    let users = data.users;

    // Text search: match username or displayName
    if (searchText) {
      const q = searchText.toLowerCase();
      users = users.filter(
        (u) =>
          u.username.toLowerCase().includes(q) ||
          u.displayName.toLowerCase().includes(q),
      );
    }

    // Quick filters
    if (quickFilter === 'off') {
      users = users.filter((u) => u.totalLoggedSeconds === 0);
    } else if (quickFilter === 'under-8h') {
      users = users.filter((u) =>
        days.some((d) => {
          const dailyTotal = u.tasks.reduce(
            (s, t) => s + (t.dailySeconds[d] ?? 0),
            0,
          );
          return dailyTotal > 0 && dailyTotal < 28800;
        }),
      );
    }
    // 'overdue' is handled externally via due tasks filter; show all for now

    return users;
  }, [data.users, searchText, quickFilter, days]);

  if (data.users.length === 0) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-sm text-[#5E6C84] dark:text-gray-400">
          No team members to display. Select a group or add members.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Config Grid button */}
      <div className="flex justify-end relative">
        <button
          onClick={() => setConfigOpen(!configOpen)}
          className={cn(
            'text-xs px-2 py-1 rounded border transition-colors flex items-center gap-1',
            configOpen
              ? 'bg-[#0052CC] text-white border-[#0052CC]'
              : 'border-[#DFE1E6] dark:border-gray-600 text-[#5E6C84] dark:text-gray-400 hover:bg-[#F4F5F7] dark:hover:bg-gray-800',
          )}
        >
          <Settings2 size={12} />
          Config Grid
        </button>

        {/* Config popover */}
        {configOpen && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setConfigOpen(false)} />
            <div className="absolute top-full right-0 mt-1 w-56 bg-white dark:bg-gray-800 border border-[#DFE1E6] dark:border-gray-600 rounded shadow-lg z-40 p-3">
              <p className="text-[10px] font-semibold text-[#5E6C84] dark:text-gray-400 uppercase tracking-wider mb-2">Visible Columns</p>
              {(['project', 'key', 'summary', 'est'] as const).map((col) => (
                <label key={col} className="flex items-center gap-2 py-1.5 px-1 rounded hover:bg-[#F4F5F7] dark:hover:bg-gray-700 cursor-pointer text-xs text-[#172B4D] dark:text-gray-200">
                  <input
                    type="checkbox"
                    checked={visibleColumns[col]}
                    onChange={() => setVisibleColumns(prev => ({ ...prev, [col]: !prev[col] }))}
                    className="w-3 h-3 accent-[#0052CC]"
                  />
                  {col === 'key' && 'Task Key'}
                  {col === 'summary' && 'Summary'}
                  {col === 'est' && 'Estimate'}
                  {col === 'project' && 'Project'}
                </label>
              ))}
            </div>
          </>
        )}
      </div>

      {filteredUsers.map((user) => (
        <div key={user.username}>
          {/* ── User Header ── */}
          <div className="flex items-center gap-2 mb-2">
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt=""
                className="w-6 h-6 rounded-full flex-shrink-0"
              />
            ) : (
              <div className="w-6 h-6 rounded-full bg-[#0052CC] dark:bg-blue-600 flex items-center justify-center flex-shrink-0">
                <span className="text-[10px] font-bold text-white">
                  {user.displayName
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2)}
                </span>
              </div>
            )}
            <h3 className="text-sm font-semibold text-[#172B4D] dark:text-gray-100">
              {user.displayName}
            </h3>
            <span className="text-xs text-[#5E6C84] dark:text-gray-400">
              Total: {user.totalLoggedDisplay} / {user.totalEstDisplay} est
            </span>
          </div>

          {/* ── Task Table ── */}
          <div className="border border-[#DFE1E6] dark:border-gray-700 rounded-sm overflow-hidden">
            {/* Header row */}
            <div className="flex bg-[#F4F5F7] dark:bg-gray-800 text-xs font-semibold text-[#5E6C84] dark:text-gray-400">
              {visibleColumns.project && <div className="w-[80px] flex-shrink-0 px-3 py-2">Project</div>}
              {visibleColumns.key && <div className="w-[120px] flex-shrink-0 px-3 py-2">Key</div>}
              {visibleColumns.summary && <div className="flex-1 px-2 py-2 min-w-0">Summary</div>}
              {visibleColumns.est && <div className="w-[72px] flex-shrink-0 px-2 py-2 text-right">Est</div>}
              {dayHeaders.map((dh) => (
                <div
                  key={dh.key}
                  className={cn(
                    'w-[64px] flex-shrink-0 px-1 py-2 text-center',
                    dh.isToday && 'bg-[#DEEBFF] dark:bg-blue-900/30 text-[#0052CC] dark:text-blue-300 rounded-t',
                  )}
                >
                  {dh.label}
                </div>
              ))}
            </div>

            {/* Task rows — grouped by project */}
            {(() => {
              // Group tasks by projectKey
              const groups: Array<{ projKey: string; tasks: TaskReport[] }> = [];
              for (const task of user.tasks) {
                const last = groups[groups.length - 1];
                if (last && last.projKey === task.projectKey) {
                  last.tasks.push(task);
                } else {
                  groups.push({ projKey: task.projectKey, tasks: [task] });
                }
              }
              return groups.map((group, gi) =>
                group.tasks.map((task, ti) => {
                  const isFirstInGroup = ti === 0;
                  const groupRowSpan = group.tasks.length;
                  const isLastOverall = gi === groups.length - 1 && ti === group.tasks.length - 1;
                  return (
                    <TaskRow
                      key={task.issueKey}
                      task={task}
                      dayHeaders={dayHeaders}
                      projectKey={isFirstInGroup ? group.projKey : null}
                      projectRowSpan={isFirstInGroup ? groupRowSpan : 0}
                      isLast={isLastOverall}
                      isGroupDivider={!isFirstInGroup && ti === 0}
                      visibleColumns={visibleColumns}
                    />
                  );
                })
              );
            })()}

            {/* Total row */}
            <div className="flex border-t border-[#DFE1E6] dark:border-gray-700 bg-[#F4F5F7] dark:bg-gray-800 text-xs font-semibold">
              {visibleColumns.project && <div className="w-[80px] flex-shrink-0 px-3 py-2" />}
              {visibleColumns.key && (
                <div className="w-[120px] flex-shrink-0 px-3 py-2 text-[#172B4D] dark:text-gray-100">Total</div>
              )}
              {visibleColumns.summary && (
                <div className="flex-1 px-2 py-2 text-[#5E6C84] dark:text-gray-400 min-w-0">
                  {user.tasks.length} task{user.tasks.length !== 1 ? 's' : ''}
                </div>
              )}
              {visibleColumns.est && (
                <div className="w-[72px] flex-shrink-0 px-2 py-2 text-right text-[#172B4D] dark:text-gray-100">
                  {user.totalEstDisplay}
                </div>
              )}
              {dayHeaders.map((dh) => {
                const d = dh.key;
                const total = user.tasks.reduce(
                  (s, t) => s + (t.dailySeconds[d] ?? 0),
                  0,
                );
                return (
                  <div
                    key={d}
                    className={cn(
                      'w-[64px] flex-shrink-0 px-1 py-2 text-center',
                      getHourClass(total),
                      dh.isToday && 'bg-[#DEEBFF] dark:bg-blue-900/30',
                    )}
                  >
                    {formatCellHours(total)}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Task Row sub-component ─────────────────────────────────────────────

function TaskRow({
  task,
  dayHeaders,
  projectKey,
  projectRowSpan,
  isLast,
  isGroupDivider,
  visibleColumns,
}: {
  task: TaskReport;
  dayHeaders: Array<{ key: string; label: string; isToday: boolean }>;
  projectKey: string | null;
  projectRowSpan: number;
  isLast: boolean;
  isGroupDivider: boolean;
  visibleColumns: Record<string, boolean>;
}) {
  return (
    <div
      className={cn(
        'flex text-xs hover:bg-[#F4F5F7]/50 dark:hover:bg-gray-800/50 transition-colors',
        !isLast && 'border-b border-[#DFE1E6] dark:border-gray-700',
        isGroupDivider && 'border-t-2 border-t-[#DFE1E6] dark:border-t-gray-600',
      )}
    >
      {/* Project — rowspan effect */}
      {visibleColumns.project && (
        <div className="w-[80px] flex-shrink-0 px-3 py-2 flex items-center border-r border-[#DFE1E6] dark:border-gray-700">
          {projectKey && (
            <span className="text-[10px] font-semibold text-[#5E6C84] dark:text-gray-400 uppercase tracking-wider">
              {projectKey}
            </span>
          )}
        </div>
      )}

      {/* Key */}
      {visibleColumns.key && (
        <div className="w-[120px] flex-shrink-0 px-3 py-2 flex items-center gap-1.5">
        {task.issueTypeIconUrl && (
          <img
            src={task.issueTypeIconUrl}
            alt={task.issueTypeName}
            className="w-3.5 h-3.5 flex-shrink-0"
          />
        )}
        <Link
          href={`/issues/${task.issueKey}`}
          className="text-[#0052CC] dark:text-blue-400 hover:underline font-medium truncate"
        >
          {task.issueKey}
        </Link>
      </div>
      )}

      {/* Summary */}
      {visibleColumns.summary && (
        <div className="flex-1 px-2 py-2 text-[#172B4D] dark:text-gray-200 truncate min-w-0">
          {task.summary}
        </div>
      )}

      {/* Estimate */}
      {visibleColumns.est && (
        <div className="w-[72px] flex-shrink-0 px-2 py-2 text-right text-[#5E6C84] dark:text-gray-400">
          {task.estDisplay}
        </div>
      )}

      {/* Daily cells */}
      {dayHeaders.map((dh) => {
        const sec = task.dailySeconds[dh.key] ?? 0;
        return (
          <div
            key={dh.key}
            className={cn(
              'w-[64px] flex-shrink-0 px-1 py-2 text-center',
              getHourClass(sec),
              dh.isToday && 'bg-[#DEEBFF] dark:bg-blue-900/30',
            )}
          >
            {formatCellHours(sec)}
          </div>
        );
      })}
    </div>
  );
}
