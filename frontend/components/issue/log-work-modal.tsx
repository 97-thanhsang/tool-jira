'use client';

import { useState, useEffect } from 'react';
import { X, Loader2, Sparkles } from 'lucide-react';
import { api } from '@/lib/api';
import { aiParseWorklog } from '@/lib/ai';
import { saveWorklog } from '@/lib/worklogs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

function getTodayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

interface LogWorkModalProps {
  issueKey: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function LogWorkModal({ issueKey, onClose, onSuccess }: LogWorkModalProps) {
  const [timeSpent, setTimeSpent] = useState('');
  const [dateStarted, setDateStarted] = useState(getTodayDate);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // AI state
  const [hasAiKey, setHasAiKey] = useState(false);
  const [naturalInput, setNaturalInput] = useState('');
  const [parseLoading, setParseLoading] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  // Read AI key from localStorage — only in useEffect
  useEffect(() => {
    setHasAiKey(!!localStorage.getItem('ai_api_key'));
  }, []);

  async function handleParseWorklog() {
    if (!naturalInput.trim()) return;
    setParseLoading(true);
    setParseError(null);
    try {
      const result = await aiParseWorklog(naturalInput.trim());
      setTimeSpent(result.timeSpent);
      if (result.comment) setComment(result.comment);
      setNaturalInput('');
    } catch (err: unknown) {
      const e = err instanceof Error ? err.message : 'AI error';
      setParseError(e);
    } finally {
      setParseLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!timeSpent.trim()) {
      setError('Time Spent is required');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const started = `${dateStarted}T09:00:00.000+0700`;
      await api.post(`/issue/${issueKey}/worklog`, {
        timeSpent: timeSpent.trim(),
        started,
        ...(comment.trim() ? { comment: comment.trim() } : {}),
      });
      // Persist to localStorage for worklog history
      saveWorklog({
        issueKey,
        summary: issueKey, // only key available here; summary shown separately
        timeSpent: timeSpent.trim(),
        date: dateStarted,
        comment: comment.trim(),
      });
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const apiErr = err as {
        response?: { data?: { errorMessages?: string[] } };
      };
      const msg =
        apiErr.response?.data?.errorMessages?.[0] ??
        'Failed to log work. Please try again.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal panel */}
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-[#172B4D]">
            Log Work — {issueKey}
          </h2>
          <button
            onClick={onClose}
            className="text-[#5E6C84] hover:text-[#172B4D] transition-colors rounded"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* AI Natural Language Input */}
          {hasAiKey && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-md p-3 space-y-2">
              <label className="block text-xs font-semibold text-indigo-700 flex items-center gap-1">
                <Sparkles size={11} />
                Describe your work (optional — AI will parse)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. họp team 2 tiếng, review PR 30 phút"
                  value={naturalInput}
                  onChange={(e) => setNaturalInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleParseWorklog(); } }}
                  className="flex-1 rounded border border-indigo-200 bg-white px-2.5 py-1.5 text-sm focus:outline-none focus:border-indigo-400"
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={handleParseWorklog}
                  disabled={parseLoading || !naturalInput.trim()}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white flex-shrink-0"
                >
                  {parseLoading ? (
                    <Loader2 size={11} className="animate-spin" />
                  ) : (
                    <Sparkles size={11} />
                  )}
                  {parseLoading ? '…' : '✨ Parse'}
                </Button>
              </div>
              {parseError && (
                <p className="text-xs text-red-600">{parseError}</p>
              )}
            </div>
          )}

          {/* Time Spent */}
          <div>
            <label className="block text-xs font-semibold text-[#172B4D] mb-1">
              Time Spent <span className="text-red-500">*</span>
            </label>
            <Input
              placeholder="e.g. 1h 30m, 2h, 45m"
              value={timeSpent}
              onChange={(e) => setTimeSpent(e.target.value)}
              autoFocus={!hasAiKey}
            />
            <p className="text-xs text-[#5E6C84] mt-1">
              Format: 1h, 30m, 1h 30m, 2d
            </p>
          </div>

          {/* Date Started */}
          <div>
            <label className="block text-xs font-semibold text-[#172B4D] mb-1">
              Date Started
            </label>
            <Input
              type="date"
              value={dateStarted}
              onChange={(e) => setDateStarted(e.target.value)}
            />
          </div>

          {/* Comment */}
          <div>
            <label className="block text-xs font-semibold text-[#172B4D] mb-1">
              Comment{' '}
              <span className="text-[#5E6C84] font-normal">(optional)</span>
            </label>
            <textarea
              className="w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm resize-none placeholder:text-muted-foreground focus:outline-none focus:border-ring focus:ring-3 focus:ring-ring/50 transition-colors"
              rows={3}
              placeholder="What did you work on?"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-1">
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button size="sm" type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 size={12} className="animate-spin" />
                  Logging…
                </>
              ) : (
                'Log Work'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
