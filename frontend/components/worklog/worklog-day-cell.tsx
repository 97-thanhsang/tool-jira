'use client';
import { useMemo } from 'react';
import { format, isToday } from 'date-fns';
import { useDroppable, useDraggable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import { Pencil } from 'lucide-react';
import type { WorklogEntry } from '@/types/jira';

// Timeline: show 6:00-17:30 (11.5h = 23 slots of 30min)
const START_HOUR = 6;        // 6:00
const END_MINUTES = 17.5 * 60; // 17:30 = 1050 min
const START_MINUTES = START_HOUR * 60; // 360
const SLOT_HEIGHT = 24;
const MINUTES_PER_SLOT = 30;
const VISIBLE_SLOTS = (END_MINUTES - START_MINUTES) / MINUTES_PER_SLOT; // 19 slots
const TIMELINE_HEIGHT = VISIBLE_SLOTS * SLOT_HEIGHT; // 456px
const LUNCH_START = 12 * 60;       // 720 min
const LUNCH_END = 13.5 * 60;       // 810 min

const PROJECT_COLORS: Record<string, string> = {
  HLU2: '#0052CC', HUBONG01: '#36B37E', HUFI: '#DE350B',
  HPMUON2: '#FF8B00', RDDEP: '#6554C0', PSDEP: '#008DA6',
};

function isWeekend(date: Date): boolean {
  return date.getDay() === 0 || date.getDay() === 6;
}

function typeAbbr(name: string): string {
  if (name === 'Sub-task') return 'SUB';
  if (name === 'Story') return 'STR';
  if (name === 'Bug') return 'BUG';
  if (name === 'Epic') return 'EPC';
  if (name === 'Task') return 'TSK';
  return name.slice(0, 3).toUpperCase();
}

const TYPE_COLORS: Record<string, string> = {
  Story: '#36B37E', 'Sub-task': '#0052CC', Bug: '#DE350B', Task: '#4BADE8',
  Epic: '#904EE2', Support: '#FF8B00', Enhancement: '#008DA6', Improvement: '#6554C0',
  'New Feature': '#E774BB', 'Build Release': '#7A869A', 'Bug after release': '#BF2600', WBS: '#505F79',
};

function TypeBadge({ typeName, iconUrl }: { typeName: string; iconUrl?: string }) {
  if (iconUrl) {
    return <img src={iconUrl} alt={typeName} className="w-3.5 h-3.5 flex-shrink-0" />;
  }
  return (
    <span className="text-[8px] font-bold px-1 py-0.5 rounded-sm flex-shrink-0 text-white"
      style={{ backgroundColor: TYPE_COLORS[typeName] ?? '#5E6C84' }}>
      {typeAbbr(typeName)}
    </span>
  );
}

function minutesFromMidnight(dateStr: string): number {
  const d = new Date(dateStr);
  return d.getHours() * 60 + d.getMinutes();
}

// ── Layout computation — only positions entries within visible timeline ──

interface LayoutEntry extends WorklogEntry {
  top: number;
  height: number;
  col: number;
  totalCols: number;
}

function layoutEntries(entries: WorklogEntry[]): LayoutEntry[] {
  if (entries.length === 0) return [];

  const sorted = [...entries].sort((a, b) => {
    const diff = minutesFromMidnight(a.started) - minutesFromMidnight(b.started);
    if (diff !== 0) return diff;
    return b.timeSpentSeconds - a.timeSpentSeconds;
  });

  const positioned = sorted.map((e) => {
    const startMin = minutesFromMidnight(e.started);
    const durationMin = Math.max(e.timeSpentSeconds / 60, 15); // min 15min visual
    // Clamp to visible range
    const visibleStart = Math.max(startMin, START_MINUTES);
    const visibleEnd = Math.min(startMin + durationMin, END_MINUTES);
    const visibleDuration = Math.max(visibleEnd - visibleStart, 15);

    return {
      ...e,
      top: ((visibleStart - START_MINUTES) / MINUTES_PER_SLOT) * SLOT_HEIGHT,
      height: Math.max((visibleDuration / MINUTES_PER_SLOT) * SLOT_HEIGHT, SLOT_HEIGHT * 0.5),
      startMin: visibleStart,
      endMin: visibleEnd,
    };
  });

  const columnEndMins: number[] = [];
  const withCols = positioned.map((e) => {
    let col = 0;
    while (col < columnEndMins.length && columnEndMins[col] > e.startMin) col++;
    if (col === columnEndMins.length) columnEndMins.push(e.endMin);
    else columnEndMins[col] = e.endMin;
    return { ...e, col, totalCols: 0 };
  });

  const totalCols = columnEndMins.length;
  return withCols.map((e) => ({ ...e, totalCols }));
}

// ── Draggable timeline entry ──

function DraggableTimelineEntry({
  entry,
  color,
  style,
  onEntryClick,
}: {
  entry: LayoutEntry;
  color: string;
  style: React.CSSProperties;
  onEntryClick?: (e: WorklogEntry) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: entry.id,
    data: { entry },
  });

  const dragStyle: React.CSSProperties = transform
    ? {
        ...style,
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 50,
        opacity: 0.7,
      }
    : style;

  const minHeight = Math.max(
    typeof style.height === 'number' ? style.height : SLOT_HEIGHT,
    SLOT_HEIGHT,
  );

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn(
        'absolute rounded-sm cursor-grab active:cursor-grabbing hover:brightness-110 transition-all group',
        isDragging ? 'opacity-50 shadow-2xl z-50' : 'z-10',
      )}
      style={{ ...dragStyle, backgroundColor: color, minHeight }}
      onClick={(ev) => {
        ev.stopPropagation();
        onEntryClick?.(entry);
      }}
      title={`${entry.issueKey}: ${entry.comment || entry.issueSummary} (${(entry.timeSpentSeconds / 3600).toFixed(1)}h)`}
    >
      <div className="px-1.5 py-1 text-white flex flex-col h-full" style={{ fontSize: '11px', lineHeight: '1.3' }}>
        {/* Top row: type icon + key */}
        <div className="flex items-center gap-1 flex-1 min-h-0">
          <TypeBadge typeName={entry.issueTypeName} iconUrl={entry.issueTypeIconUrl} />
          <span className="font-semibold truncate flex-1">{entry.issueKey}</span>
        </div>

        {/* Bottom row: hours + pencil */}
        <div className="flex items-center justify-between mt-0.5">
          <span className="text-white/70 text-[10px] font-medium">
            {(entry.timeSpentSeconds / 3600).toFixed(1)}h
          </span>
          <button
            className="opacity-60 hover:opacity-100 transition-opacity hover:bg-white/20 rounded-sm p-0.5 -mr-0.5"
            onPointerDown={(ev) => ev.stopPropagation()}
            onClick={(ev) => { ev.stopPropagation(); onEntryClick?.(entry); }}
            title="Edit worklog"
          >
            <Pencil size={10} className="text-white/80" />
          </button>
        </div>

        {/* Comment — only if tall enough */}
        {entry.height > 50 && entry.comment && (
          <p className="text-white/60 text-[9px] truncate mt-0.5 leading-tight">{entry.comment}</p>
        )}
      </div>
    </div>
  );
}

// ── Main component ──

interface WorklogDayCellProps {
  date: Date;
  entries: WorklogEntry[];
  dailyHours: number;
  isCurrentMonth?: boolean;
  compact?: boolean;
  showRequirement?: boolean;
  isDragActive?: boolean;
  isDragSource?: boolean;
  onEntryClick?: (entry: WorklogEntry) => void;
  onDayClick?: (date: Date) => void;
}

export function WorklogDayCell({
  date,
  entries,
  dailyHours,
  isCurrentMonth = true,
  compact = false,
  showRequirement = true,
  isDragActive = false,
  isDragSource = false,
  onEntryClick,
  onDayClick,
}: WorklogDayCellProps) {
  const key = format(date, 'yyyy-MM-dd');
  const { setNodeRef } = useDroppable({ id: key });
  const weekend = isWeekend(date);
  const todayFlag = isToday(date);
  const isWeekday = !weekend;
  const hours = dailyHours > 0 ? dailyHours.toFixed(1) : '';

  const isComplete = isWeekday && dailyHours >= 8 && showRequirement;
  const isUnder = isWeekday && dailyHours > 0 && dailyHours < 8 && showRequirement;
  const isEmpty = isWeekday && dailyHours === 0 && showRequirement;
  const isOverHours = dailyHours > 8;

  const laidOutEntries = useMemo(() => layoutEntries(entries), [entries]);

  // ── Weekend / Compact: simple list (no timeline) ──

  if (weekend || compact) {
    const compactProgressPct = Math.min((dailyHours / 8) * 100, 100);
    const compactProgressColor = isComplete ? '#36B37E' : isUnder ? '#FFAB00' : isEmpty ? '#DE350B' : '#0052CC';

    return (
      <div
        ref={setNodeRef}
        className={cn(
          'flex flex-col border border-[#DFE1E6] dark:border-gray-700 bg-white dark:bg-gray-800/50 min-h-0 transition-colors',
          compact ? 'p-0' : 'p-1.5 min-h-[80px]',
          todayFlag && 'bg-[#DEEBFF] dark:bg-blue-900/20 border-[#0052CC] dark:border-blue-500',
          !isCurrentMonth && 'opacity-40 bg-[#F4F5F7] dark:bg-gray-900/50',
          isDragSource && 'bg-red-50 dark:bg-red-900/10 border-red-300 dark:border-red-700',
          isDragActive && !isDragSource && 'opacity-60',
        )}
        onClick={() => onDayClick?.(date)}
      >
        <div
          className={cn(
            'flex items-center justify-between flex-shrink-0',
            compact ? 'px-1 py-0.5 text-[10px]' : 'px-1.5 py-1 text-xs',
          )}
        >
          <span
            className={cn(
              'font-semibold',
              todayFlag
                ? 'text-[#0052CC] dark:text-blue-400'
                : 'text-[#172B4D] dark:text-gray-200',
            )}
          >
            {compact ? format(date, 'd') : format(date, 'EEE d')}
          </span>
          {isWeekday && showRequirement && (
            <span
              className={cn(
                'text-[10px] font-medium flex items-center gap-0.5',
                isComplete && 'text-green-600 dark:text-green-400',
                isOverHours && 'text-blue-600 dark:text-blue-400',
                isUnder && 'text-amber-600 dark:text-amber-400',
                isEmpty && 'text-red-500 dark:text-red-400',
                !isComplete && !isOverHours && !isUnder && !isEmpty && 'text-[#5E6C84] dark:text-gray-400',
              )}
            >
              {isComplete && <span className="text-[9px] mr-0.5">✓</span>}
              {isEmpty && <span className="text-[9px] mr-0.5">!</span>}
              {isUnder && <span className="text-[9px] mr-0.5">◷</span>}
              {hours}h / 8h
            </span>
          )}
          {!isWeekday && hours && (
            <span className="text-[10px] text-[#5E6C84] dark:text-gray-400">
              {hours}h
            </span>
          )}
        </div>
        {/* Progress bar for compact mode */}
        {compact && isWeekday && (
          <div className="h-1.5 bg-[#F4F5F7] dark:bg-gray-700 flex-shrink-0">
            <div className="h-full transition-all duration-300 rounded-r-sm"
              style={{ width: `${compactProgressPct}%`, backgroundColor: compactProgressColor, minWidth: dailyHours > 0 ? '2px' : '0' }} />
          </div>
        )}
        <div
          className={cn(
            'flex-1 space-y-0.5',
            compact ? 'overflow-hidden px-1 py-0.5' : 'overflow-y-auto max-h-full',
          )}
        >
          {entries.slice(0, compact ? 99 : 10).map((e) => (
            <div
              key={e.id}
              className="px-1.5 py-0.5 text-[11px] bg-white dark:bg-gray-800 border border-[#DFE1E6] dark:border-gray-700 rounded-sm cursor-pointer hover:shadow-sm transition-all group"
              style={{
                borderLeftColor: PROJECT_COLORS[e.projectKey] ?? '#5E6C84',
                borderLeftWidth: '3px',
              }}
              onClick={(ev) => {
                ev.stopPropagation();
                onEntryClick?.(e);
              }}
            >
              <div className="flex items-center justify-between gap-1">
                <div className="flex items-center gap-1 min-w-0">
                  <TypeBadge typeName={e.issueTypeName} iconUrl={e.issueTypeIconUrl} />
                  <span className="font-medium text-[#172B4D] dark:text-gray-100 truncate">
                    {e.issueKey}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    className="opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity text-[#5E6C84] hover:text-[#0052CC]"
                    onPointerDown={(ev) => ev.stopPropagation()}
                    onClick={(ev) => { ev.stopPropagation(); onEntryClick?.(e); }}
                    title="Edit worklog"
                  >
                    <Pencil size={10} />
                  </button>
                  <span className="text-[#5E6C84] dark:text-gray-400 flex-shrink-0 font-medium">
                    {(e.timeSpentSeconds / 3600).toFixed(1)}h
                  </span>
                </div>
              </div>
            </div>
          ))}
          {!compact && entries.length > 10 && (
            <p className="text-[10px] text-[#0052CC] dark:text-blue-400 pl-1">
              +{entries.length - (compact ? 3 : 10)} more
            </p>
          )}
        </div>
      </div>
    );
  }

  // ── Weekday (non-compact): timeline view — no scroll, working hours only ──
  const progressPct = Math.min((dailyHours / 8) * 100, 100);
  const progressColor = isComplete ? '#36B37E' : isUnder ? '#FFAB00' : isEmpty ? '#DE350B' : '#0052CC';

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex flex-col border border-[#DFE1E6] dark:border-gray-700 bg-white dark:bg-gray-800/50 min-h-0 relative transition-colors',
        todayFlag && 'bg-[#DEEBFF] dark:bg-blue-900/20 border-[#0052CC] dark:border-blue-500',
        !isCurrentMonth && 'opacity-40',
        isOverHours && 'bg-[#DEEBFF]/10 dark:bg-blue-900/10',
        // Drag visuals
        isDragSource && 'bg-red-50 dark:bg-red-900/10 border-red-300 dark:border-red-700',
        isDragActive && !isDragSource && 'opacity-60',
      )}
      onClick={() => onDayClick?.(date)}
    >
      {/* Header with progress bar */}
      <div className="flex-shrink-0 bg-white dark:bg-gray-800 z-10">
        <div className="flex items-center justify-between px-1.5 py-1 border-b border-[#DFE1E6] dark:border-gray-700">
          <span className={cn('text-xs font-semibold',
            todayFlag ? 'text-[#0052CC] dark:text-blue-400' : 'text-[#172B4D] dark:text-gray-200')}>
            {format(date, 'EEE d')}
          </span>
          <span className={cn('text-[10px] font-medium',
            isComplete ? 'text-green-600 dark:text-green-400' :
            isOverHours ? 'text-blue-600 dark:text-blue-400' :
            isUnder ? 'text-amber-600 dark:text-amber-400' :
            'text-red-500 dark:text-red-400')}>
            {hours ? `${hours}h` : '0h'} / 8h
          </span>
        </div>
        {/* Progress bar */}
        <div className="h-2 bg-[#F4F5F7] dark:bg-gray-700">
          <div
            className="h-full transition-all duration-300 rounded-r-sm"
            style={{ width: `${progressPct}%`, backgroundColor: progressColor, minWidth: dailyHours > 0 ? '2px' : '0' }}
          />
        </div>
      </div>

      {/* Timeline — fixed height, no scroll */}
      <div className="flex-1 relative" style={{ minHeight: TIMELINE_HEIGHT }}>
        <div className="relative" style={{ height: TIMELINE_HEIGHT }}>
          {/* Slot backgrounds */}
          {Array.from({ length: VISIBLE_SLOTS }).map((_, i) => {
            const minutes = START_MINUTES + i * MINUTES_PER_SLOT;
            const hour = Math.floor(minutes / 60);
            const isHour = minutes % 60 === 0;
            const isLunch = minutes >= LUNCH_START && minutes < LUNCH_END;

              return (
              <div
                key={i}
                className={cn(
                  'absolute left-0 right-0 border-t',
                  isHour
                    ? 'border-[#C1C7D0] dark:border-gray-600'
                    : 'border-dashed border-[#F4F5F7] dark:border-gray-700/50',
                  isLunch && 'bg-[#FFF7E6] dark:bg-amber-900/5',
                )}
                style={{ top: i * SLOT_HEIGHT, height: SLOT_HEIGHT }}
              >
                {isHour && (
                  <span className="absolute left-1 top-0 text-[9px] text-[#8993A4] dark:text-gray-500 leading-none pt-0.5 select-none">
                    {String(hour).padStart(2, '0')}:00
                  </span>
                )}
                {!isHour && (
                  <span className="absolute left-1 top-0 text-[8px] text-[#C1C7D0] dark:text-gray-600 leading-none pt-0.5 select-none">
                    {String(hour).padStart(2, '0')}:{String(minutes % 60).padStart(2, '0')}
                  </span>
                )}
              </div>
            );
          })}

          {/* Entry overlay */}
          {laidOutEntries.length > 0 && (
            <div style={{ position: 'absolute', top: 0, left: '38px', right: '2px', bottom: 0 }}>
              {laidOutEntries.map((e) => {
                const color = PROJECT_COLORS[e.projectKey] ?? '#5E6C84';
                const entryHeight = Math.max(e.height - 2, SLOT_HEIGHT * 0.5);

                return (
                  <DraggableTimelineEntry
                    key={e.id}
                    entry={e}
                    color={color}
                    style={{
                      position: 'absolute',
                      top: e.top,
                      left: `${(e.col / e.totalCols) * 100}%`,
                      width: `${Math.max((1 / e.totalCols) * 100 - 1, 5)}%`,
                      height: entryHeight,
                    }}
                    onEntryClick={onEntryClick}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
