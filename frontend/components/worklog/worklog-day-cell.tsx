'use client';
import { useRef, useEffect, useMemo } from 'react';
import { format, isToday } from 'date-fns';
import { useDroppable, useDraggable } from '@dnd-kit/core';
import { CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WorklogEntry } from '@/types/jira';

const SLOT_HEIGHT = 24;
const MINUTES_PER_SLOT = 30;
const TOTAL_SLOTS = 48;

const PROJECT_COLORS: Record<string, string> = {
  HLU2: '#0052CC', HUBONG01: '#36B37E', HUFI: '#DE350B',
  HPMUON2: '#FF8B00', RDDEP: '#6554C0', PSDEP: '#008DA6',
};

function isWeekend(date: Date): boolean {
  return date.getDay() === 0 || date.getDay() === 6;
}

function minutesFromMidnight(dateStr: string): number {
  const d = new Date(dateStr);
  return d.getHours() * 60 + d.getMinutes();
}

function isWorkHours(minutes: number): boolean {
  return (minutes >= 480 && minutes < 720) || (minutes >= 810 && minutes < 1050);
}

function isLunchBreak(minutes: number): boolean {
  return minutes >= 720 && minutes < 810;
}

// ── Layout computation ──

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
    const durationMin = Math.max(e.timeSpentSeconds / 60, 30);
    return {
      ...e,
      top: (startMin / MINUTES_PER_SLOT) * SLOT_HEIGHT,
      height: Math.max((durationMin / MINUTES_PER_SLOT) * SLOT_HEIGHT, SLOT_HEIGHT),
      startMin,
      endMin: startMin + durationMin,
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
        'absolute rounded-sm cursor-grab active:cursor-grabbing hover:brightness-110 transition-all',
        isDragging ? 'opacity-50 shadow-2xl z-50' : 'z-10',
      )}
      style={{ ...dragStyle, backgroundColor: color, minHeight }}
      onClick={(ev) => {
        ev.stopPropagation();
        onEntryClick?.(entry);
      }}
      title={`${entry.issueKey}: ${entry.comment || entry.issueSummary} (${(entry.timeSpentSeconds / 3600).toFixed(1)}h)`}
    >
      <div
        className="px-1 py-0.5 text-white overflow-hidden"
        style={{ fontSize: '10px', lineHeight: '1.2' }}
      >
        <div className="font-semibold truncate">{entry.issueKey}</div>
        {entry.height > 40 && (
          <div className="text-white/80 truncate">
            {entry.comment || entry.issueSummary}
          </div>
        )}
        {entry.height > 30 && (
          <div className="text-white/70 text-[9px]">
            {(entry.timeSpentSeconds / 3600).toFixed(1)}h
          </div>
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
  onEntryClick,
  onDayClick,
}: WorklogDayCellProps) {
  const key = format(date, 'yyyy-MM-dd');
  const { setNodeRef } = useDroppable({ id: key });
  const scrollRef = useRef<HTMLDivElement>(null);
  const weekend = isWeekend(date);
  const todayFlag = isToday(date);
  const isWeekday = !weekend;
  const hours = dailyHours > 0 ? dailyHours.toFixed(1) : '';

  const isComplete = isWeekday && dailyHours >= 8 && showRequirement;
  const isUnder = isWeekday && dailyHours > 0 && dailyHours < 8 && showRequirement;
  const isEmpty = isWeekday && dailyHours === 0 && showRequirement;
  const isOverHours = dailyHours > 8;

  const laidOutEntries = useMemo(() => layoutEntries(entries), [entries]);

  // Auto-scroll to 8:00 on mount (weekday + non-compact only)
  useEffect(() => {
    if (!weekend && scrollRef.current && !compact) {
      const scrollTo = (8 * 60 / MINUTES_PER_SLOT) * SLOT_HEIGHT - 40;
      scrollRef.current.scrollTop = scrollTo;
    }
  }, [weekend, compact]);

  // ── Weekend / Compact: simple list (no timeline) ──

  if (weekend || compact) {
    return (
      <div
        ref={setNodeRef}
        className={cn(
          'flex flex-col border border-[#DFE1E6] dark:border-gray-700 bg-white dark:bg-gray-800/50 min-h-0 transition-colors',
          compact ? 'p-1' : 'p-1.5 min-h-[80px]',
          todayFlag && 'bg-[#DEEBFF] dark:bg-blue-900/20 border-[#0052CC] dark:border-blue-500',
          !isCurrentMonth && 'opacity-40 bg-[#F4F5F7] dark:bg-gray-900/50',
        )}
        onClick={() => onDayClick?.(date)}
      >
        <div
          className={cn(
            'flex items-center justify-between mb-0.5 flex-shrink-0',
            compact ? 'text-[10px]' : 'text-xs',
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
              {isComplete && <CheckCircle2 size={10} />}
              {isEmpty && <AlertCircle size={10} />}
              {isUnder && <Clock size={10} />}
              {hours}h / 8h
            </span>
          )}
          {!isWeekday && hours && (
            <span className="text-[10px] text-[#5E6C84] dark:text-gray-400">
              {hours}h
            </span>
          )}
        </div>
        <div
          className={cn(
            'flex-1 overflow-y-auto space-y-0.5',
            compact ? 'max-h-[60px]' : 'max-h-full',
          )}
        >
          {entries.slice(0, compact ? 3 : 10).map((e) => (
            <div
              key={e.id}
              className="px-1.5 py-0.5 text-[11px] bg-white dark:bg-gray-800 border border-[#DFE1E6] dark:border-gray-700 rounded-sm cursor-pointer hover:shadow-sm transition-all"
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
                <span className="font-medium text-[#172B4D] dark:text-gray-100 truncate">
                  {e.issueKey}
                </span>
                <span className="text-[#5E6C84] dark:text-gray-400 flex-shrink-0 font-medium">
                  {(e.timeSpentSeconds / 3600).toFixed(1)}h
                </span>
              </div>
            </div>
          ))}
          {entries.length > (compact ? 3 : 10) && (
            <p className="text-[10px] text-[#0052CC] dark:text-blue-400 pl-1">
              +{entries.length - (compact ? 3 : 10)} more
            </p>
          )}
        </div>
      </div>
    );
  }

  // ── Weekday (non-compact): timeline view ──

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex flex-col border border-[#DFE1E6] dark:border-gray-700 bg-white dark:bg-gray-800/50 min-h-0 relative',
        todayFlag && 'bg-[#DEEBFF] dark:bg-blue-900/20 border-[#0052CC] dark:border-blue-500',
        !isCurrentMonth && 'opacity-40',
        isOverHours && 'bg-[#DEEBFF]/10 dark:bg-blue-900/10',
      )}
      onClick={() => onDayClick?.(date)}
    >
      {/* Header — pinned top */}
      <div className="flex items-center justify-between px-1.5 py-1 flex-shrink-0 border-b border-[#DFE1E6] dark:border-gray-700 bg-white dark:bg-gray-800 z-10">
        <span
          className={cn(
            'text-xs font-semibold',
            todayFlag
              ? 'text-[#0052CC] dark:text-blue-400'
              : 'text-[#172B4D] dark:text-gray-200',
          )}
        >
          {format(date, 'EEE d')}
        </span>
        {isWeekday && (
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
            {isComplete && <CheckCircle2 size={10} />}
            {isEmpty && <AlertCircle size={10} />}
            {isUnder && <Clock size={10} />}
            {hours ? `${hours}h / 8h` : '0h / 8h'}
          </span>
        )}
      </div>

      {/* Timeline — scrollable */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto relative" style={{ minHeight: 0 }}>
        <div className="relative" style={{ height: TOTAL_SLOTS * SLOT_HEIGHT }}>
          {/* 48 slot rows */}
          {Array.from({ length: TOTAL_SLOTS }).map((_, i) => {
            const minutes = i * MINUTES_PER_SLOT;
            const hour = Math.floor(minutes / 60);
            const isHour = minutes % 60 === 0;

            return (
              <div
                key={i}
                className={cn(
                  'absolute left-0 right-0 border-t',
                  isHour
                    ? 'border-[#C1C7D0] dark:border-gray-600'
                    : 'border-dashed border-[#F4F5F7] dark:border-gray-700/50',
                  isWorkHours(minutes) && 'bg-[#F4F9FF] dark:bg-blue-900/5',
                  isLunchBreak(minutes) && 'bg-[#FFF7E6] dark:bg-amber-900/5',
                )}
                style={{ top: i * SLOT_HEIGHT, height: SLOT_HEIGHT }}
              >
                {isHour && (
                  <span className="absolute left-1 top-0 text-[9px] text-[#8993A4] dark:text-gray-500 leading-none pt-0.5 select-none">
                    {String(hour).padStart(2, '0')}:00
                  </span>
                )}
              </div>
            );
          })}

          {/* Entry overlay — positioned right of time markers */}
          {laidOutEntries.length > 0 && (
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: '38px',
                right: '2px',
                bottom: 0,
              }}
            >
              {laidOutEntries.map((e) => {
                const color = PROJECT_COLORS[e.projectKey] ?? '#5E6C84';
                const entryHeight = Math.max(e.height - 2, SLOT_HEIGHT);

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
