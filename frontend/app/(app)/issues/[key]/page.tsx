'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, ExternalLink, Clock } from 'lucide-react';
import { useIssue } from '@/hooks/use-issue';
import { WikiRenderer } from '@/components/issue/wiki-renderer';
import { TransitionButton } from '@/components/issue/transition-button';
import { LogWorkModal } from '@/components/issue/log-work-modal';
import { CommentSection } from '@/components/issue/comment-section';
import { StatusBadge } from '@/components/shared/status-badge';
import { PriorityIcon } from '@/components/shared/priority-icon';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function DetailSkeleton() {
  return (
    <div className="p-6 max-w-6xl mx-auto">
      <Skeleton className="h-5 w-40 mb-4" />
      <Skeleton className="h-7 w-3/4 mb-6" />
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-4/6" />
          <Skeleton className="h-4 w-full" />
        </div>
        <div className="space-y-3">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-2/4" />
        </div>
      </div>
    </div>
  );
}

export default function IssueDetailPage() {
  const params = useParams();
  const issueKey = Array.isArray(params.key)
    ? params.key[0]
    : (params.key ?? '');
  const { issue, isLoading, error, mutate } = useIssue(issueKey);
  const [logWorkOpen, setLogWorkOpen] = useState(false);

  // Listen for the 'L' keyboard shortcut dispatched by the layout
  useEffect(() => {
    function handleOpenLogWork() {
      setLogWorkOpen(true);
    }
    window.addEventListener('open-log-work', handleOpenLogWork);
    return () => window.removeEventListener('open-log-work', handleOpenLogWork);
  }, []);

  if (isLoading) return <DetailSkeleton />;

  if (error || !issue) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-600 mb-3 text-sm">
          Issue not found or failed to load
        </p>
        <Link href="/board">
          <Button variant="outline" size="sm">
            ← Back to Board
          </Button>
        </Link>
      </div>
    );
  }

  const f = issue.fields;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-4 text-sm text-[#5E6C84]">
        <Link
          href="/board"
          className="hover:text-[#0052CC] flex items-center gap-1 transition-colors"
        >
          <ArrowLeft size={14} />
          Board
        </Link>
        <span>/</span>
        <span className="text-[#172B4D] font-medium">{issueKey}</span>
      </div>

      {/* Title row */}
      <div className="flex items-start gap-3 mb-6">
        <h1 className="text-xl font-semibold text-[#172B4D] flex-1 leading-snug">
          {f.summary}
        </h1>
        <a
          href={`https://task.ascvn.com.vn/browse/${issueKey}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-shrink-0 text-[#5E6C84] hover:text-[#0052CC] mt-1 transition-colors"
          title="Open in Jira"
        >
          <ExternalLink size={16} />
        </a>
      </div>

      {/* 70/30 layout */}
      <div className="grid grid-cols-3 gap-6">
        {/* ── Left: Description + Sub-tasks + Comments ── */}
        <div className="col-span-2 space-y-6">
          {/* Description */}
          <section>
            <h2 className="text-xs font-semibold text-[#5E6C84] uppercase tracking-wider mb-3">
              Description
            </h2>
            <div className="bg-white rounded-sm border border-[#DFE1E6] p-4">
              <WikiRenderer content={f.description} />
            </div>
          </section>

          {/* Sub-tasks */}
          {f.subtasks && f.subtasks.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold text-[#5E6C84] uppercase tracking-wider mb-3">
                Sub-tasks ({f.subtasks.length})
              </h2>
              <div className="bg-white rounded-sm border border-[#DFE1E6] divide-y divide-[#DFE1E6]">
                {f.subtasks.map((sub) => (
                  <Link
                    key={sub.id}
                    href={`/issues/${sub.key}`}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-[#F4F5F7] transition-colors"
                  >
                    <span className="text-xs text-[#0052CC] font-medium w-28 flex-shrink-0">
                      {sub.key}
                    </span>
                    <span className="text-sm text-[#172B4D] flex-1 truncate">
                      {sub.fields.summary}
                    </span>
                    <StatusBadge status={sub.fields.status} />
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Comments section */}
          <CommentSection
            issueKey={issueKey}
            comments={f.comment?.comments ?? []}
            onCommentAdded={() => mutate()}
          />
        </div>

        {/* ── Right: Metadata sidebar ── */}
        <div>
          <div className="bg-white rounded-sm border border-[#DFE1E6] p-4 space-y-4">
            {/* Status transition */}
            <div>
              <label className="text-xs font-semibold text-[#5E6C84] uppercase tracking-wider block mb-1.5">
                Status
              </label>
              <TransitionButton
                issueKey={issueKey}
                currentStatus={f.status}
                onTransitioned={() => mutate()}
              />
            </div>

            {/* Log Work */}
            <div>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start gap-2"
                onClick={() => setLogWorkOpen(true)}
              >
                <Clock size={13} />
                Log Work
              </Button>
            </div>

            {/* Priority */}
            <div>
              <label className="text-xs font-semibold text-[#5E6C84] uppercase tracking-wider block mb-1.5">
                Priority
              </label>
              <div className="flex items-center gap-2">
                <PriorityIcon priority={f.priority} />
                <span className="text-sm text-[#172B4D]">
                  {f.priority.name}
                </span>
              </div>
            </div>

            {/* Assignee */}
            <div>
              <label className="text-xs font-semibold text-[#5E6C84] uppercase tracking-wider block mb-1.5">
                Assignee
              </label>
              <span className="text-sm text-[#172B4D]">
                {f.assignee?.displayName ?? 'Unassigned'}
              </span>
            </div>

            {/* Reporter */}
            <div>
              <label className="text-xs font-semibold text-[#5E6C84] uppercase tracking-wider block mb-1.5">
                Reporter
              </label>
              <span className="text-sm text-[#172B4D]">
                {f.reporter.displayName}
              </span>
            </div>

            {/* Project */}
            <div>
              <label className="text-xs font-semibold text-[#5E6C84] uppercase tracking-wider block mb-1.5">
                Project
              </label>
              <span className="text-sm text-[#172B4D]">{f.project.name}</span>
            </div>

            {/* Parent */}
            {f.parent && (
              <div>
                <label className="text-xs font-semibold text-[#5E6C84] uppercase tracking-wider block mb-1.5">
                  Parent
                </label>
                <Link
                  href={`/issues/${f.parent.key}`}
                  className="text-sm text-[#0052CC] hover:underline"
                >
                  {f.parent.key}: {f.parent.fields.summary}
                </Link>
              </div>
            )}

            {/* Created */}
            <div>
              <label className="text-xs font-semibold text-[#5E6C84] uppercase tracking-wider block mb-1.5">
                Created
              </label>
              <span className="text-sm text-[#172B4D]">
                {formatDate(f.created)}
              </span>
            </div>

            {/* Updated */}
            <div>
              <label className="text-xs font-semibold text-[#5E6C84] uppercase tracking-wider block mb-1.5">
                Updated
              </label>
              <span className="text-sm text-[#172B4D]">
                {formatDate(f.updated)}
              </span>
            </div>

            {/* Labels */}
            {f.labels && f.labels.length > 0 && (
              <div>
                <label className="text-xs font-semibold text-[#5E6C84] uppercase tracking-wider block mb-1.5">
                  Labels
                </label>
                <div className="flex flex-wrap gap-1">
                  {f.labels.map((label) => (
                    <span
                      key={label}
                      className="text-xs bg-[#DFE1E6] text-[#42526E] px-2 py-0.5 rounded-sm"
                    >
                      {label}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Log Work Modal */}
      {logWorkOpen && (
        <LogWorkModal
          issueKey={issueKey}
          onClose={() => setLogWorkOpen(false)}
          onSuccess={() => mutate()}
        />
      )}
    </div>
  );
}
