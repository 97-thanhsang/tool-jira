'use client';

import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
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
          {/* Time Spent */}
          <div>
            <label className="block text-xs font-semibold text-[#172B4D] mb-1">
              Time Spent <span className="text-red-500">*</span>
            </label>
            <Input
              placeholder="e.g. 1h 30m, 2h, 45m"
              value={timeSpent}
              onChange={(e) => setTimeSpent(e.target.value)}
              autoFocus
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
