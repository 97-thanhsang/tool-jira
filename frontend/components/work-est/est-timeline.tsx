'use client';

import { useMemo, useState } from 'react';
import { startOfWeek, addDays, format } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WorkEstDaySchedule, WorkEstAllocation } from '@/lib/work-est-api';

interface Props {
  schedule: WorkEstDaySchedule[];
  workingDays: string[];
}

// ── Helpers (match worklog-day-cell.tsx exactly) ──────────────────────────

const TYPE_COLORS: Record<string, string> = {
  'Task': '#0052CC', 'Sub-task': '#008DA6', 'Story': '#36B37E',
  'Bug': '#DE350B', 'Epic': '#6554C0', 'Improvement': '#FF8B00',
};

function typeAbbr(name: string): string {
  if (name === 'Sub-task') return 'SUB';
  if (name === 'Story') return 'STR';
  if (name === 'Bug') return 'BUG';
  if (name === 'Epic') return 'EPC';
  if (name === 'Task') return 'TSK';
  return name.slice(0, 3).toUpperCase();
}

function TypeBadge({ typeName, iconUrl }: { typeName: string; iconUrl?: string }) {
  if (iconUrl) return <img src={iconUrl} alt={typeName} className="w-3.5 h-3.5 flex-shrink-0" />;
  return (
    <span className="text-[8px] font-bold px-1 py-0.5 rounded-sm flex-shrink-0 text-white"
      style={{ backgroundColor: TYPE_COLORS[typeName] ?? '#5E6C84' }}>
      {typeAbbr(typeName)}
    </span>
  );
}

function getStatusBgColor(status: string | undefined): string {
  if (!status) return '#F4F5F7';
  const s = status.toLowerCase();
  if (['done', 'closed', 'resolved', 'completed'].some(x => s.includes(x))) return '#E3FCEF';
  if (['in progress', 'in review', 'development', 'testing'].some(x => s.includes(x))) return '#DEEBFF';
  if (['to do', 'open', 'backlog', 'new'].some(x => s.includes(x))) return '#F4F5F7';
  if (['cancelled', 'rejected'].some(x => s.includes(x))) return '#F4F5F7';
  if (['blocked', 'impediment'].some(x => s.includes(x))) return '#FFEBE6';
  return '#F4F5F7';
}

function getStatusColor(status: string | undefined): string {
  if (!status) return '#42526E';
  const s = status.toLowerCase();
  if (['done', 'closed', 'resolved', 'completed'].some(x => s.includes(x))) return '#006644';
  if (['in progress', 'in review', 'development', 'testing'].some(x => s.includes(x))) return '#0052CC';
  if (['to do', 'open', 'backlog', 'new'].some(x => s.includes(x))) return '#42526E';
  if (['cancelled', 'rejected'].some(x => s.includes(x))) return '#6B778C';
  if (['blocked', 'impediment'].some(x => s.includes(x))) return '#DE350B';
  return '#42526E';
}

function getPriorityColor(priority: string | undefined): string {
  if (!priority) return '#DFE1E6';
  const colors: Record<string, string> = {
    Highest: '#DE350B', High: '#FF5630', Blocker: '#DE350B',
    Medium: '#FFAB00', Low: '#2684FF', Lowest: '#2684FF', Minor: '#6B778C',
  };
  return colors[priority] ?? '#6B778C';
}

function getPriorityBgColor(priority: string | undefined): string {
  if (!priority) return '#F4F5F7';
  const colors: Record<string, string> = {
    Highest: '#FFEBE6', High: '#FFEDE8', Blocker: '#FFEBE6',
    Medium: '#FFF7E6', Low: '#E6F0FF', Lowest: '#E6F0FF', Minor: '#F4F5F7',
  };
  return colors[priority] ?? '#F4F5F7';
}

function getEntryBorderColor(issueKey: string): string {
  let hash = 0;
  for (let i = 0; i < issueKey.length; i++) hash = issueKey.charCodeAt(i) + ((hash << 5) - hash);
  const palette = ['#0052CC','#36B37E','#DE350B','#FF8B00','#6554C0','#008DA6','#E774BB','#00B8D9','#5243AA','#BF2600','#403294','#006644','#FF991F','#172B4D','#0747A6'];
  return palette[Math.abs(hash) % palette.length];
}

// ── Allocation Card (giống hệt WorklogEntryCard) ─────────────────────────

function AllocationCard({ alloc, columnDate }: { alloc: WorkEstAllocation; columnDate: string }) {
  return (
    <div
      className="px-3 py-2 text-[12px] bg-white dark:bg-gray-800 border border-[#DFE1E6] dark:border-gray-700 rounded-sm hover:shadow-sm transition-all group"
      style={{ borderLeftColor: getEntryBorderColor(alloc.issueKey), borderLeftWidth: '3px' }}
    >
      {/* Row 1: type badge + issue key + project + status */}
      <div className="flex items-center gap-2 mb-[5px]">
        <TypeBadge typeName={alloc.issueTypeName} iconUrl={alloc.issueTypeIconUrl} />
        <span className="font-semibold text-[#172B4D] dark:text-gray-100 truncate text-xs">{alloc.issueKey}</span>
        <span className="text-[11px] text-[#8993A4] dark:text-gray-500 truncate flex-shrink-0">{alloc.projectKey}</span>
        <div className="flex-1" />
        {alloc.status && (
          <span className="text-[10px] px-2 py-[1px] rounded font-medium shrink-0"
            style={{ backgroundColor: getStatusBgColor(alloc.status), color: getStatusColor(alloc.status) }}>
            {alloc.status}
          </span>
        )}
      </div>

      {/* Row 2: summary */}
      <p className="text-[11px] text-[#5E6C84] dark:text-gray-400 leading-relaxed mb-[5px]" title={alloc.summary}>{alloc.summary}</p>

      {/* Row 3: left=column date, right=hours badge */}
      <div className="flex items-center justify-between text-[10px] mb-[3px]">
        <div className="flex items-center gap-2.5 text-[#8993A4] dark:text-gray-500" />
        <div className="flex items-center gap-2.5">
          <span className="font-bold px-1.5 py-[1px] rounded text-[11px]"
            style={{ backgroundColor: alloc.hours > 0 ? '#DEEBFF' : '#F4F5F7', color: alloc.hours > 0 ? '#0052CC' : '#8993A4' }}>
            {alloc.hours}h
          </span>
        </div>
      </div>

      {/* Row 4: priority + assignee */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          {alloc.priority && (
            <span className="text-[10px] px-2 py-[2px] rounded font-medium"
              style={{ backgroundColor: getPriorityBgColor(alloc.priority), color: getPriorityColor(alloc.priority) }}>
              {alloc.priority}
            </span>
          )}
          {alloc.assigneeDisplayName && (
            <span className="text-[10px] text-[#8993A4] dark:text-gray-500 ml-1">{alloc.assigneeDisplayName}</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Day Column ─────────────────────────────────────────────────────────────

function DayColumn({ day }: { day: WorkEstDaySchedule }) {
  const date = new Date(day.date + 'T00:00:00');
  const dayLabel = format(date, 'EEE');
  const dateLabel = format(date, 'dd/MM');
  const todayFlag = format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
  const totalWithExisting = day.totalHours + day.existingHours;
  const isOver = totalWithExisting > 8;
  const progressPct = Math.min(100, Math.round((day.totalHours / 8) * 100));

  return (
    <div className={cn(
      'flex flex-col border border-[#DFE1E6] dark:border-gray-700 bg-white dark:bg-gray-800/50 rounded-sm overflow-hidden min-h-[300px]',
      todayFlag && 'bg-[#DEEBFF]/40 dark:bg-blue-900/20 border-[#0052CC]/50',
    )}>
      {/* Header */}
      <div className={cn(
        'flex items-center justify-between px-2 py-1.5 border-b border-[#DFE1E6] dark:border-gray-700 bg-[#FAFBFC] dark:bg-gray-800/60',
        todayFlag && 'bg-[#DEEBFF]/60',
      )}>
        <div className="flex items-center gap-1.5">
          <span className={cn('text-[10px] font-semibold', todayFlag ? 'text-[#0052CC]' : 'text-[#172B4D] dark:text-gray-200')}>{dayLabel}</span>
          <span className="text-[10px] text-[#5E6C84] dark:text-gray-400">{dateLabel}</span>
        </div>
        <span className={cn('text-[10px] font-semibold', isOver ? 'text-red-500' : day.totalHours >= 8 ? 'text-green-600' : day.totalHours > 0 ? 'text-[#0052CC]' : 'text-[#C1C7D0]')}>
          {day.totalHours}h{day.existingHours > 0 && <span className="text-[9px] text-[#8993A4] ml-0.5">+{day.existingHours}h</span>}
        </span>
      </div>

      {/* Progress bar */}
      {day.totalHours > 0 && (
        <div className="h-1 bg-[#F4F5F7] dark:bg-gray-700 flex-shrink-0">
          <div className="h-full rounded-r-sm transition-all" style={{ width: `${progressPct}%`, backgroundColor: isOver ? '#DE350B' : '#0052CC' }} />
        </div>
      )}

      {/* Existing allocation notice */}
      {day.existingHours > 0 && day.allocations.length === 0 && (
        <div className="mx-2 mt-2 px-2.5 py-2 bg-[#F8F9FA] dark:bg-gray-800/30 border-l-2 border-[#C1C7D0] rounded-sm">
          <div className="text-[10px] text-[#5E6C84] italic">Đã có {day.existingHours}h từ tasks khác</div>
        </div>
      )}

      {/* Allocation cards */}
      <div className="flex-1 space-y-1.5 p-2 overflow-y-auto">
        {day.allocations.length === 0 && day.existingHours === 0 ? (
          <div className="text-[10px] text-[#C1C7D0] dark:text-gray-500 text-center italic pt-8">Trống</div>
        ) : (
          day.allocations.map(alloc => (
            <AllocationCard key={`${day.date}-${alloc.issueKey}`} alloc={alloc} columnDate={day.date} />
          ))
        )}
      </div>
    </div>
  );
}

// ── Main Timeline ──────────────────────────────────────────────────────────

export function EstTimeline({ schedule, workingDays }: Props) {
  const [weekOffset, setWeekOffset] = useState(0);
  const dayHeaders = ['T2', 'T3', 'T4', 'T5', 'T6'];

  const weeks = useMemo(() => {
    if (workingDays.length === 0) return [];
    const groups: string[][] = [];
    let cur: string[] = [];
    for (const day of workingDays) {
      const d = new Date(day + 'T00:00:00');
      if (d.getDay() === 1 && cur.length > 0) { groups.push(cur); cur = []; }
      cur.push(day);
    }
    if (cur.length > 0) groups.push(cur);
    return groups;
  }, [workingDays]);

  const currentWeekDays = weeks[weekOffset] ?? [];
  const weekIndex = weekOffset + 1;
  const totalWeeks = weeks.length;

  const gridDays: (string | null)[] = [];
  if (currentWeekDays.length > 0) {
    const first = new Date(currentWeekDays[0] + 'T00:00:00');
    const start = startOfWeek(first, { weekStartsOn: 1 });
    for (let i = 0; i < 5; i++) {
      const d = addDays(start, i);
      gridDays.push(currentWeekDays.includes(format(d, 'yyyy-MM-dd')) ? format(d, 'yyyy-MM-dd') : null);
    }
  }

  const weekLabel = currentWeekDays.length > 0
    ? `${format(new Date(currentWeekDays[0] + 'T00:00:00'), 'dd/MM')} \u2013 ${format(new Date(currentWeekDays[currentWeekDays.length - 1] + 'T00:00:00'), 'dd/MM/yyyy')}`
    : '';

  const scheduleMap = useMemo(() => {
    const m = new Map<string, WorkEstDaySchedule>();
    for (const d of schedule) m.set(d.date, d);
    return m;
  }, [schedule]);

  const totalHours = schedule.reduce((s, d) => s + d.totalHours, 0);
  const totalCapacity = workingDays.length * 8;

  if (workingDays.length === 0) return null;

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <button onClick={() => setWeekOffset(o => Math.max(0, o - 1))} disabled={weekOffset === 0}
            className="p-1.5 rounded border border-[#DFE1E6] dark:border-gray-600 text-[#5E6C84] hover:bg-[#F4F5F7] dark:hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed">
            <ChevronLeft size={14} />
          </button>
          <span className="text-sm font-semibold text-[#172B4D] dark:text-gray-100 w-44 text-center">{weekLabel}</span>
          <button onClick={() => setWeekOffset(o => Math.min(totalWeeks - 1, o + 1))} disabled={weekOffset >= totalWeeks - 1}
            className="p-1.5 rounded border border-[#DFE1E6] dark:border-gray-600 text-[#5E6C84] hover:bg-[#F4F5F7] dark:hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed">
            <ChevronRight size={14} />
          </button>
          <span className="text-[10px] text-[#5E6C84]">Tu\u1EA7n {weekIndex}/{totalWeeks}</span>
        </div>
        <div className="flex items-center gap-3 text-xs text-[#5E6C84] dark:text-gray-400">
          <span className="font-semibold text-[#172B4D] dark:text-gray-200">{totalHours}h / {totalCapacity}h</span>
          <span className="w-px h-4 bg-[#DFE1E6] dark:border-gray-700" />
          <span>{workingDays.length} ngày</span>
        </div>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-5 gap-2 mb-1">
        {dayHeaders.map((d, i) => (
          <div key={d} className={cn('text-center text-[10px] font-semibold py-1 rounded-sm',
            gridDays[i] && scheduleMap.has(gridDays[i]!) ? 'text-[#5E6C84] dark:text-gray-400' : 'text-[#C1C7D0] dark:text-gray-600',
          )}>{d}</div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-5 gap-2">
        {gridDays.map((dayKey, i) => {
          if (!dayKey) return <div key={`e-${i}`} className="min-h-[300px] bg-[#F8F9FA] dark:bg-gray-800/20 border border-dashed border-[#DFE1E6] dark:border-gray-700 rounded-sm" />;
          const ds = scheduleMap.get(dayKey);
          return <DayColumn key={dayKey} day={ds ?? { date: dayKey, allocations: [], totalSeconds: 0, totalHours: 0, existingSeconds: 0, existingHours: 0 }} />;
        })}
      </div>
    </div>
  );
}
