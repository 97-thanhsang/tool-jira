'use client';

import { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { getStoredUser } from '@/lib/api';
import { addWorklog, deleteWorklog, fetchTodayWorklogs, fetchIssueWorklogTotal } from '@/lib/worklog-api';
import { validateWorklogRules } from '@/lib/worklog-validation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface LogWorkModalProps {
  issueKey: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function LogWorkModal({ issueKey, onClose, onSuccess }: LogWorkModalProps) {
  const [timeSpent, setTimeSpent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Username for worklog API
  const [username, setUsername] = useState<string | null>(null);
  useEffect(() => {
    const u = getStoredUser();
    setUsername(u?.name ?? null);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const hs = parseFloat(timeSpent);
    if (isNaN(hs) || hs <= 0) {
      setError('Please enter a valid number of hours');
      return;
    }

    if (!username) {
      setError('Not authenticated');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const todayStr = new Date().toISOString().slice(0, 10);

      // Fetch today's worklogs and lifetime total
      const [todayWorklogs, lifetimeTotal] = await Promise.all([
        fetchTodayWorklogs(username),
        fetchIssueWorklogTotal(issueKey),
      ]);

      const todayForIssue = todayWorklogs.filter(e => e.issueKey === issueKey);

      // Validate using shared rules (slot calculation excludes overwritten worklogs)
      const validation = validateWorklogRules({
        issueKey,
        newHoursRequested: hs,
        todayWorklogsForIssue: todayForIssue,
        allTodayWorklogs: todayWorklogs,
        lifetimeTotalSeconds: lifetimeTotal,
      });

      if (!validation.valid) {
        setError(validation.error ?? null);
        setIsSubmitting(false);
        return;
      }

      // Delete existing today worklogs for this issue (overwrite model)
      for (const wl of todayForIssue) {
        await deleteWorklog(issueKey, wl.id);
      }

      // Create new worklog
      await addWorklog({
        issueKey,
        timeSpentSeconds: Math.round(hs * 3600),
        comment: '',
        started: validation.started!,
      });

      onSuccess();
      onClose();
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { errorMessages?: string[] } } };
      const msg = apiErr.response?.data?.errorMessages?.[0] ?? 'Failed to log work.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />

      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-sm mx-4 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-[#172B4D]">
            Log Work — {issueKey}
          </h2>
          <button onClick={onClose} className="text-[#5E6C84] hover:text-[#172B4D]" aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-[#172B4D] mb-1">
              Time Spent <span className="text-red-500">*</span>
            </label>
            <Input
              placeholder="e.g. 1.5 (hours)"
              value={timeSpent}
              onChange={e => setTimeSpent(e.target.value)}
              autoFocus
              type="number"
              min="0"
              step="0.5"
            />
            <p className="text-[10px] text-[#5E6C84] mt-1">Hours (e.g. 2, 1.5, 0.5)</p>
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}

          <div className="flex items-center justify-end gap-2 pt-1">
            <Button variant="outline" size="sm" type="button" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button size="sm" type="submit" disabled={isSubmitting}>
              {isSubmitting ? <><Loader2 size={12} className="animate-spin" /> Logging…</> : 'Log Work'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
