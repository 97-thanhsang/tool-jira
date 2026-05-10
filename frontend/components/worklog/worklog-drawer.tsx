'use client';
import { useState, useEffect } from 'react';
import { X, Trash2, ExternalLink, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import type { WorklogEntry } from '@/types/jira';
import { Button } from '@/components/ui/button';

interface WorklogDrawerProps {
  entry: WorklogEntry | null;
  onClose: () => void;
  onSave: (changes: { timeSpentSeconds: number; comment: string; started: string }) => void;
  onDelete: () => void;
  issueDailyHours?: number;
}

export function WorklogDrawer({ entry, onClose, onSave, onDelete, issueDailyHours = 0 }: WorklogDrawerProps) {
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);
  const [comment, setComment] = useState('');
  const [startedDate, setStartedDate] = useState('');
  const [startedTime, setStartedTime] = useState('');
  const [dirty, setDirty] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [workHoursWarning, setWorkHoursWarning] = useState<string | null>(null);

  useEffect(() => {
    if (entry) {
      const h = Math.floor(entry.timeSpentSeconds / 3600);
      const m = Math.floor((entry.timeSpentSeconds % 3600) / 60);
      setHours(h); setMinutes(m);
      setComment(entry.comment ?? '');
      const started = new Date(entry.started);
      setStartedDate(format(started, 'yyyy-MM-dd'));
      setStartedTime(format(started, 'HH:mm'));
      setDirty(false);
      setConfirmDelete(false);
    }
  }, [entry]);

  useEffect(() => {
    if (!startedTime) return;
    const [h, m] = startedTime.split(':').map(Number);
    const totalMinutes = h * 60 + m;

    const morningStart = 8 * 60;
    const morningEnd = 12 * 60;
    const afternoonStart = 13 * 60 + 30;
    const afternoonEnd = 17 * 60 + 30;

    if (totalMinutes < morningStart ||
        (totalMinutes >= morningEnd && totalMinutes < afternoonStart) ||
        totalMinutes > afternoonEnd) {
      setWorkHoursWarning('Outside working hours (8:00-12:00, 13:30-17:30)');
    } else {
      setWorkHoursWarning(null);
    }
  }, [startedTime]);

  if (!entry) return null;

  const totalSeconds = hours * 3600 + minutes * 60;
  const capExceeded = issueDailyHours > 0 && (totalSeconds + issueDailyHours * 3600 > 8 * 3600);

  const handleSave = () => {
    if (totalSeconds <= 0) return;
    const started = `${startedDate}T${startedTime}:00.000+0700`;
    onSave({ timeSpentSeconds: totalSeconds, comment, started });
    setDirty(false);
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed top-0 right-0 h-full w-80 bg-white dark:bg-gray-800 border-l border-[#DFE1E6] dark:border-gray-700 shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#DFE1E6] dark:border-gray-700">
          <h3 className="text-sm font-semibold text-[#172B4D] dark:text-gray-100">Worklog Detail</h3>
          <button onClick={onClose} className="hover:text-[#0052CC]">
            <X size={16} className="text-[#5E6C84] dark:text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Issue link */}
          <div>
            <a href={`/issues/${entry.issueKey}`} className="text-sm text-[#0052CC] dark:text-blue-400 font-medium hover:underline flex items-center gap-1">
              {entry.issueKey} <ExternalLink size={12} />
            </a>
            <p className="text-xs text-[#172B4D] dark:text-gray-200 mt-0.5">{entry.issueSummary}</p>
          </div>

          {/* Project */}
          <div>
            <label className="text-[10px] font-semibold text-[#5E6C84] dark:text-gray-400 uppercase">Project</label>
            <p className="text-xs text-[#172B4D] dark:text-gray-100 mt-0.5">{entry.projectName}</p>
          </div>

          {/* Time spent */}
          <div>
            <label className="text-[10px] font-semibold text-[#5E6C84] dark:text-gray-400 uppercase">Time Spent</label>
            <div className="flex items-center gap-2 mt-1">
              <input type="number" min={0} max={24}
                className="w-16 text-xs border border-[#DFE1E6] dark:border-gray-600 rounded px-2 py-1.5 bg-white dark:bg-gray-800 text-[#172B4D] dark:text-gray-100 focus:outline-none focus:border-[#0052CC]"
                value={hours} onChange={(e) => { setHours(Number(e.target.value)); setDirty(true); }} />
              <span className="text-xs text-[#5E6C84] dark:text-gray-400">h</span>
              <input type="number" min={0} max={59}
                className="w-16 text-xs border border-[#DFE1E6] dark:border-gray-600 rounded px-2 py-1.5 bg-white dark:bg-gray-800 text-[#172B4D] dark:text-gray-100 focus:outline-none focus:border-[#0052CC]"
                value={minutes} onChange={(e) => { setMinutes(Number(e.target.value)); setDirty(true); }} />
              <span className="text-xs text-[#5E6C84] dark:text-gray-400">m</span>
            </div>
          </div>

          {/* Date + Time */}
          <div>
            <label className="text-[10px] font-semibold text-[#5E6C84] dark:text-gray-400 uppercase">Started</label>
            <div className="flex items-center gap-2 mt-1">
              <input type="date"
                className="text-xs border border-[#DFE1E6] dark:border-gray-600 rounded px-2 py-1.5 bg-white dark:bg-gray-800 text-[#172B4D] dark:text-gray-100 focus:outline-none focus:border-[#0052CC]"
                value={startedDate} onChange={(e) => { setStartedDate(e.target.value); setDirty(true); }} />
              <input type="time"
                className="text-xs border border-[#DFE1E6] dark:border-gray-600 rounded px-2 py-1.5 bg-white dark:bg-gray-800 text-[#172B4D] dark:text-gray-100 focus:outline-none focus:border-[#0052CC]"
                value={startedTime} onChange={(e) => { setStartedTime(e.target.value); setDirty(true); }} />
            </div>
            {workHoursWarning && (
              <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1">
                <AlertTriangle size={10} />
                {workHoursWarning}
              </p>
            )}
            {capExceeded && (
              <p className="text-[10px] text-red-500 dark:text-red-400 mt-1 flex items-center gap-1">
                <AlertTriangle size={10} />
                This issue will exceed 8h daily cap ({((totalSeconds + issueDailyHours * 3600) / 3600).toFixed(1)}h total)
              </p>
            )}
          </div>

          {/* Comment */}
          <div>
            <label className="text-[10px] font-semibold text-[#5E6C84] dark:text-gray-400 uppercase">Comment</label>
            <textarea
              className="w-full text-xs border border-[#DFE1E6] dark:border-gray-600 rounded px-2 py-1.5 bg-white dark:bg-gray-800 text-[#172B4D] dark:text-gray-100 focus:outline-none focus:border-[#0052CC] mt-1 resize-none h-20"
              value={comment} onChange={(e) => { setComment(e.target.value); setDirty(true); }}
              placeholder="What did you work on?" />
          </div>

          {/* Author */}
          <div>
            <label className="text-[10px] font-semibold text-[#5E6C84] dark:text-gray-400 uppercase">Author</label>
            <p className="text-xs text-[#172B4D] dark:text-gray-100 mt-0.5">{entry.author.displayName}</p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-[#DFE1E6] dark:border-gray-700">
          {confirmDelete ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-red-500">Delete?</span>
              <Button size="sm" onClick={() => { onDelete(); setConfirmDelete(false); onClose(); }}
                className="text-xs bg-red-500 text-white hover:bg-red-600">Yes</Button>
              <Button size="sm" onClick={() => setConfirmDelete(false)}
                className="text-xs border-[#DFE1E6] text-[#5E6C84]">No</Button>
            </div>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(true)}
              className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 text-xs">
              <Trash2 size={14} className="mr-1" /> Delete
            </Button>
          )}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onClose}
              className="text-xs border-[#DFE1E6] dark:border-gray-700 text-[#5E6C84] dark:text-gray-400">Cancel</Button>
            <Button size="sm" onClick={handleSave} disabled={!dirty || totalSeconds <= 0}
              className="text-xs bg-[#0052CC] text-white hover:bg-[#0747A6] disabled:opacity-50">Save</Button>
          </div>
        </div>
      </div>
    </>
  );
}
