'use client';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { startOfWeek, subWeeks, addWeeks, addDays, startOfMonth, subMonths, addMonths, format } from 'date-fns';
import { CheckCircle2, XCircle, Clock } from 'lucide-react';
import { getStoredUser } from '@/lib/api';
import { updateWorklog } from '@/lib/worklog-api';
import { useWorklogs } from '@/hooks/use-worklogs';
import { useWorklogMutations } from '@/hooks/use-worklog-mutations';
import { WorklogCalendar } from '@/components/worklog/worklog-calendar';
import { WorklogFilters, type WorklogFiltersType } from '@/components/worklog/worklog-filters';
import { WorklogDrawer } from '@/components/worklog/worklog-drawer';
import type { WorklogEntry } from '@/types/jira';
import { cn } from '@/lib/utils';

export default function WorklogPage() {
  const [initialized, setInitialized] = useState(false);

  // Filters — always start empty on server, populate username on client mount
  const [filters, setFilters] = useState<WorklogFiltersType>({
    username: '',
    dateFrom: '',
    dateTo: '',
    period: 'week',
    project: '',
  });

  useEffect(() => {
    const user = getStoredUser();
    const username = (user as { name?: string } | null)?.name ?? '';
    if (username) {
      setFilters(prev => prev.username ? prev : { ...prev, username });
    }
    setInitialized(true);
  }, []);

  // Derive date range from period
  const activeFilters = useMemo(() => {
    const now = new Date();
    let from = filters.dateFrom;
    let to = filters.dateTo;

    if (filters.period === 'week') {
      const start = startOfWeek(now, { weekStartsOn: 1 });
      from = format(start, 'yyyy-MM-dd');
      to = format(addWeeks(start, 1), 'yyyy-MM-dd');
    } else if (filters.period === 'month') {
      const start = startOfMonth(now);
      from = format(start, 'yyyy-MM-dd');
      to = format(addMonths(start, 1), 'yyyy-MM-dd');
    } else if (filters.period === 'year') {
      from = format(new Date(now.getFullYear(), 0, 1), 'yyyy-MM-dd');
      to = format(new Date(now.getFullYear(), 11, 31), 'yyyy-MM-dd');
    }

    return {
      username: filters.username,
      dateFrom: from,
      dateTo: to,
      project: filters.project || undefined,
    };
  }, [filters]);

  const { data, entriesByDate, isLoading, mutate } = useWorklogs(
    initialized && activeFilters.username ? activeFilters : null,
  );

  // Calendar state
  const [baseDate, setBaseDate] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [mode, setMode] = useState<'week' | 'month'>('week');

  const handleNavigate = useCallback((direction: 'prev' | 'next') => {
    setBaseDate((prev: Date) => {
      if (mode === 'week') return direction === 'prev' ? subWeeks(prev, 1) : addWeeks(prev, 1);
      return direction === 'prev' ? subMonths(prev, 1) : addMonths(prev, 1);
    });
  }, [mode]);

  // CRUD
  const { add, update, remove, toast } = useWorklogMutations(() => mutate());

  // Drawer
  const [drawerEntry, setDrawerEntry] = useState<WorklogEntry | null>(null);

  // Per-issue daily hours for the selected entry
  const issueDailyHours = useMemo(() => {
    if (!drawerEntry || !data) return 0;
    const dateKey = new Date(drawerEntry.started).toISOString().slice(0, 10);
    const dayEntries = data.entries.filter(
      e => e.issueKey === drawerEntry.issueKey &&
           new Date(e.started).toISOString().slice(0, 10) === dateKey,
    );
    return dayEntries.reduce((sum, e) => sum + e.timeSpentSeconds / 3600, 0);
  }, [drawerEntry, data]);

  // Drag-and-drop: move entry to different date
  const handleDragEnd = useCallback(async (entryId: string, newDate: string) => {
    if (!data) return;
    const entry = data.entries.find(e => e.id === entryId);
    if (!entry) return;

    const oldDate = new Date(entry.started).toISOString().slice(0, 10);
    if (oldDate === newDate) return;

    const oldStarted = new Date(entry.started);
    const newStarted = `${newDate}T${format(oldStarted, 'HH:mm')}:00.000+0700`;

    try {
      await updateWorklog(entry.issueKey, entry.id, {
        timeSpentSeconds: entry.timeSpentSeconds,
        comment: entry.comment,
        started: newStarted,
      });
      mutate();
    } catch {
      // handled by hook toast
    }
  }, [data, mutate]);

  // Quick-add via drawer (empty day click → open issue search later)
  const handleDayClick = useCallback((_date: Date) => {
    // Placeholder: open add dialog in future
  }, []);

  // Week progress (Mon-Fri only, current view week)
  const weekProgress = useMemo(() => {
    if (!data) return null;
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    let total = 0;
    let workDays = 0;
    for (let i = 0; i < 5; i++) {
      const d = addDays(weekStart, i);
      const key = format(d, 'yyyy-MM-dd');
      total += data.dailyHours[key] ?? 0;
      workDays++;
    }
    return { total, required: workDays * 8 };
  }, [data]);

  return (
    <div className="flex flex-col h-screen p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div>
          <h1 className="text-xl font-semibold text-[#172B4D] dark:text-gray-100 flex items-center gap-2">
            <Clock size={20} className="text-[#0052CC]" />
            Worklog Calendar
          </h1>
          {data && (
            <p className="text-sm text-[#5E6C84] dark:text-gray-400 mt-0.5 flex items-center gap-2">
              {data.total} entries · {data.totalHours.toFixed(1)}h total
              {weekProgress && (
                <span className={`text-xs ml-1 px-2 py-0.5 rounded-full font-medium ${
                  weekProgress.total >= weekProgress.required
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                }`}>
                  {weekProgress.total.toFixed(1)}h / {weekProgress.required}h this week
                </span>
              )}
            </p>
          )}
        </div>
      </div>

      {/* Filters */}
      <WorklogFilters filters={filters} onChange={setFilters} />

      {/* Calendar */}
      <div className="flex-1 min-h-0 mt-4">
        <WorklogCalendar
          mode={mode}
          baseDate={baseDate}
          entriesByDate={entriesByDate}
          dailyHours={data?.dailyHours ?? {}}
          onNavigate={handleNavigate}
          onModeChange={setMode}
          onEntryClick={setDrawerEntry}
          onDayClick={handleDayClick}
          onDragEnd={handleDragEnd}
        />
      </div>

      {/* Edit Drawer */}
      <WorklogDrawer
        entry={drawerEntry}
        onClose={() => setDrawerEntry(null)}
        onSave={(changes) => drawerEntry && update(drawerEntry, changes)}
        onDelete={() => drawerEntry && remove(drawerEntry)}
        issueDailyHours={issueDailyHours}
      />

      {/* Toast */}
      {toast && (
        <div className={cn(
          'fixed bottom-6 right-6 z-[60] flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium',
          toast.type === 'success' ? 'bg-[#36B37E] text-white' : 'bg-red-500 text-white',
        )}>
          {toast.type === 'success' ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
          {toast.message}
        </div>
      )}
    </div>
  );
}
