'use client';
import { useMemo, useState } from 'react';
import { startOfWeek, addDays, format } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { DndContext, DragOverlay, closestCenter, type DragStartEvent, type DragEndEvent } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import type { WorklogEntry } from '@/types/jira';
import { WorklogDayCell, type GroupByField } from './worklog-day-cell';
import { WorklogEntryCard } from './worklog-entry-card';
import { Button } from '@/components/ui/button';

interface WorklogCalendarProps {
  mode: 'day' | 'week' | 'month';
  baseDate: Date;
  entriesByDate: Record<string, WorklogEntry[]>;
  dailyHours: Record<string, number>;
  groupBy?: GroupByField;
  subGroupBy?: GroupByField;
  onNavigate: (direction: 'prev' | 'next') => void;
  onModeChange: (mode: 'day' | 'week' | 'month') => void;
  onEntryClick?: (entry: WorklogEntry) => void;
  onDayClick?: (date: Date) => void;
  onDragEnd?: (entryId: string, newDate: string) => void;
}

export function WorklogCalendar({
  mode,
  baseDate,
  entriesByDate,
  dailyHours,
  groupBy,
  subGroupBy,
  onNavigate,
  onModeChange,
  onEntryClick,
  onDayClick,
  onDragEnd,
}: WorklogCalendarProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [dragSourceDate, setDragSourceDate] = useState<string | null>(null);

  const days = useMemo(() => {
    const result: Date[] = [];
    if (mode === 'day') {
      result.push(baseDate);
    } else if (mode === 'week') {
      const start = startOfWeek(baseDate, { weekStartsOn: 1 });
      for (let i = 0; i < 7; i++) result.push(addDays(start, i));
    } else {
      const year = baseDate.getFullYear();
      const month = baseDate.getMonth();
      const firstDay = new Date(year, month, 1);
      const start = startOfWeek(firstDay, { weekStartsOn: 1 });
      for (let i = 0; i < 42; i++) result.push(addDays(start, i));
    }
    return result;
  }, [mode, baseDate]);

  const activeEntry = useMemo(() => {
    if (!activeId) return null;
    for (const entries of Object.values(entriesByDate)) {
      const found = entries.find((e) => e.id === activeId);
      if (found) return found;
    }
    return null;
  }, [activeId, entriesByDate]);

  const dayHeaders = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigate('prev')}
            className="border-[#DFE1E6] dark:border-gray-700 text-[#5E6C84] hover:bg-[#F4F5F7] dark:hover:bg-gray-800"
          >
            <ChevronLeft size={14} />
          </Button>
          <h2 className="text-sm font-semibold text-[#172B4D] dark:text-gray-100 w-40 text-center">
            {mode === 'day'
              ? format(baseDate, 'EEEE, MMM d, yyyy')
              : mode === 'week'
                ? `${format(days[0], 'MMM d')} – ${format(days[6], 'MMM d, yyyy')}`
                : format(baseDate, 'MMMM yyyy')}
          </h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigate('next')}
            className="border-[#DFE1E6] dark:border-gray-700 text-[#5E6C84] hover:bg-[#F4F5F7] dark:hover:bg-gray-800"
          >
            <ChevronRight size={14} />
          </Button>
        </div>
        <div className="flex rounded-sm border border-[#DFE1E6] dark:border-gray-700 overflow-hidden">
          <button
            onClick={() => onModeChange('day')}
            className={`text-xs px-3 py-1 ${
              mode === 'day'
                ? 'bg-[#0052CC] text-white'
                : 'bg-white dark:bg-gray-800 text-[#5E6C84] hover:bg-[#F4F5F7] dark:hover:bg-gray-700'
            }`}
          >
            Day
          </button>
          <button
            onClick={() => onModeChange('week')}
            className={`text-xs px-3 py-1 border-l border-[#DFE1E6] dark:border-gray-700 ${
              mode === 'week'
                ? 'bg-[#0052CC] text-white'
                : 'bg-white dark:bg-gray-800 text-[#5E6C84] hover:bg-[#F4F5F7] dark:hover:bg-gray-700'
            }`}
          >
            Week
          </button>
          <button
            onClick={() => onModeChange('month')}
            className={`text-xs px-3 py-1 border-l border-[#DFE1E6] dark:border-gray-700 ${
              mode === 'month'
                ? 'bg-[#0052CC] text-white'
                : 'bg-white dark:bg-gray-800 text-[#5E6C84] hover:bg-[#F4F5F7] dark:hover:bg-gray-700'
            }`}
          >
            Month
          </button>
        </div>
      </div>

      {/* Day headers (skip for day mode) */}
      {mode !== 'day' && (
      <div className="grid grid-cols-7 gap-px mb-1 flex-shrink-0">
        {dayHeaders.map((d) => (
          <div
            key={d}
            className="text-center text-[10px] font-semibold text-[#5E6C84] dark:text-gray-400 py-1"
          >
            {d}
          </div>
        ))}
      </div>
      )}

      {/* Calendar grid */}
      <DndContext
        collisionDetection={closestCenter}
        onDragStart={(e: DragStartEvent) => {
          setActiveId(String(e.active.id));
          // Find which date the dragged entry belongs to
          const id = String(e.active.id);
          for (const [dateKey, entries] of Object.entries(entriesByDate)) {
            if (entries.some(entry => entry.id === id)) {
              setDragSourceDate(dateKey);
              break;
            }
          }
        }}
        onDragEnd={(e: DragEndEvent) => {
          setActiveId(null);
          setDragSourceDate(null);
          if (e.over) onDragEnd?.(String(e.active.id), String(e.over.id));
        }}
      >
        <div
          className={cn(
            'grid gap-px flex-1 min-h-0 bg-[#DFE1E6] dark:bg-gray-700 rounded-sm overflow-hidden',
            mode === 'day' ? 'grid-cols-1' : 'grid-cols-7',
          )}
          style={{ gridTemplateRows: mode === 'week' || mode === 'day' ? '1fr' : undefined }}
        >
          {days.map((day) => {
            const key = format(day, 'yyyy-MM-dd');
            const isDragSource = activeId !== null && key === dragSourceDate;
            return (
              <WorklogDayCell
                key={key}
                date={day}
                entries={entriesByDate[key] ?? []}
                dailyHours={dailyHours[key] ?? 0}
                compact={mode === 'month'}
                isCurrentMonth={
                  mode === 'day' || mode === 'week' || day.getMonth() === baseDate.getMonth()
                }
                isDragActive={activeId !== null}
                isDragSource={isDragSource}
                groupBy={groupBy}
                subGroupBy={subGroupBy}
                onEntryClick={onEntryClick}
                onDayClick={onDayClick}
              />
            );
          })}
        </div>

        <DragOverlay>
          {activeEntry && <WorklogEntryCard entry={activeEntry} isDragging />}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
