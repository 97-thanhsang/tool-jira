'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { usePipelineSummary } from '@/hooks/use-pipeline';
import type { PipelineStage, PipelineStatus } from '@/types/opencode';
import { STAGE_CONFIG } from '@/types/opencode';

interface PipelineStageNavProps {
  taskKey: string;
}

const STAGE_ORDER: PipelineStage[] = ['decompose', 'extractor', 'analyze', 'solution', 'execute'];

const DOT_CLASSES: Record<PipelineStatus, string> = {
  IDLE:    'bg-muted border-muted-foreground/30',
  RUNNING: 'bg-blue-400 border-blue-500 animate-pulse',
  DONE:    'bg-emerald-500 border-emerald-600',
  FAILED:  'bg-red-500 border-red-600',
  BLOCKED: 'bg-orange-400 border-orange-500',
};

const LINE_CLASSES: Record<PipelineStatus, string> = {
  IDLE:    'bg-border',
  RUNNING: 'bg-blue-200',
  DONE:    'bg-emerald-400',
  FAILED:  'bg-red-200',
  BLOCKED: 'bg-orange-200',
};

const TAB_ACTIVE: Record<PipelineStatus, string> = {
  IDLE:    'border-foreground/30 text-foreground/50',
  RUNNING: 'border-blue-500 text-blue-600',
  DONE:    'border-emerald-500 text-emerald-700',
  FAILED:  'border-red-500 text-red-700',
  BLOCKED: 'border-orange-500 text-orange-700',
};

export function PipelineStageNav({ taskKey }: PipelineStageNavProps) {
  const pathname = usePathname();
  const { summary } = usePipelineSummary(taskKey);

  // Determine current stage from pathname: /opencode/[key]/[stage]
  const segments = pathname.split('/');
  const activeStage = segments[segments.length - 1] as PipelineStage | undefined;

  return (
    <div className="space-y-3">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/opencode" className="hover:text-foreground transition-colors">
          OpenCode
        </Link>
        <span>/</span>
        <span className="font-mono font-medium text-foreground">{taskKey}</span>
      </div>

      {/* Stage tabs with progress connector */}
      <div className="flex items-stretch gap-0 overflow-x-auto pb-1">
        {STAGE_ORDER.map((stage, idx) => {
          const cfg = STAGE_CONFIG[stage];
          const stageData = summary?.stages?.[stage];
          const status: PipelineStatus = stageData?.status ?? 'IDLE';
          const isActive = activeStage === stage;

          return (
            <div key={stage} className="flex items-center shrink-0">
              {/* Tab button */}
              <Link
                href={`/opencode/${taskKey}/${stage}`}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-md border transition-all whitespace-nowrap',
                  isActive
                    ? cn('border-b-2 rounded-b-none bg-background shadow-sm', TAB_ACTIVE[status])
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50',
                )}
                title={cfg.description}
              >
                {/* Status dot */}
                <span
                  className={cn(
                    'inline-block w-2 h-2 rounded-full border',
                    DOT_CLASSES[status],
                  )}
                />
                <span>{cfg.icon}</span>
                <span>{cfg.label}</span>
              </Link>

              {/* Connector line between tabs */}
              {idx < STAGE_ORDER.length - 1 && (
                <div className={cn('w-4 h-0.5 shrink-0', LINE_CLASSES[status])} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
