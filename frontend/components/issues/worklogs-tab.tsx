'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import { getWorklogs } from '@/lib/worklogs';
import type { WorklogEntry } from '@/lib/worklogs';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function WorklogsTab() {
  const [worklogs, setWorklogs] = useState<WorklogEntry[]>([]);

  // Read from localStorage only on client (useEffect)
  useEffect(() => {
    setWorklogs(getWorklogs());
  }, []);

  if (worklogs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Clock size={40} className="text-[#DFE1E6] dark:text-gray-600 mb-3" />
        <p className="text-sm text-[#5E6C84] dark:text-gray-400">
          No worklogs yet. Log work on an issue using the{' '}
          <kbd className="font-mono text-xs px-1 py-0.5 bg-[#F4F5F7] dark:bg-gray-700 border border-[#DFE1E6] dark:border-gray-600 rounded">
            L
          </kbd>{' '}
          key or the Log Work button.
        </p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-xs text-[#5E6C84] dark:text-gray-400 mb-3">
        Last {worklogs.length} worklogs (stored locally)
      </p>
      <div className="bg-white dark:bg-gray-800 rounded-sm border border-[#DFE1E6] dark:border-gray-700 overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[120px_1fr_80px_100px_1fr] gap-3 px-4 py-2 bg-[#F4F5F7] dark:bg-gray-700 border-b border-[#DFE1E6] dark:border-gray-600">
          <span className="text-xs font-semibold text-[#5E6C84] dark:text-gray-400 uppercase tracking-wide">Issue</span>
          <span className="text-xs font-semibold text-[#5E6C84] dark:text-gray-400 uppercase tracking-wide">Summary</span>
          <span className="text-xs font-semibold text-[#5E6C84] dark:text-gray-400 uppercase tracking-wide">Time</span>
          <span className="text-xs font-semibold text-[#5E6C84] dark:text-gray-400 uppercase tracking-wide">Date</span>
          <span className="text-xs font-semibold text-[#5E6C84] dark:text-gray-400 uppercase tracking-wide">Comment</span>
        </div>

        {worklogs.map((entry, idx) => (
          <div
            key={idx}
            className="grid grid-cols-[120px_1fr_80px_100px_1fr] gap-3 px-4 py-3 border-b border-[#DFE1E6] dark:border-gray-700 last:border-b-0 hover:bg-[#F4F5F7] dark:hover:bg-gray-700 transition-colors"
          >
            <Link
              href={`/issues/${entry.issueKey}`}
              className="text-xs text-[#0052CC] font-medium truncate hover:underline"
            >
              {entry.issueKey}
            </Link>
            <span className="text-sm text-[#172B4D] dark:text-gray-200 truncate">
              {entry.summary && entry.summary !== entry.issueKey
                ? entry.summary
                : '—'}
            </span>
            <span className="text-xs font-medium text-[#172B4D] dark:text-gray-200 font-mono">
              {entry.timeSpent}
            </span>
            <span className="text-xs text-[#5E6C84] dark:text-gray-400">
              {formatDate(entry.date)}
            </span>
            <span className="text-xs text-[#5E6C84] dark:text-gray-400 truncate">
              {entry.comment || '—'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
