import { cn } from '@/lib/utils';
import type { PipelineStage, PipelineStatus } from '@/types/opencode';
import { STAGE_CONFIG } from '@/types/opencode';

interface PipelineProgressBarProps {
  stages: Partial<Record<PipelineStage, { status: PipelineStatus }>>;
  onStageClick?: (stage: PipelineStage) => void;
}

const STAGE_ORDER: PipelineStage[] = ['decompose', 'extractor', 'analyze', 'solution', 'execute'];

const DOT_CLASSES: Record<PipelineStatus, string> = {
  IDLE:    'bg-muted border-muted-foreground/30',
  RUNNING: 'bg-blue-400 border-blue-600 animate-pulse',
  DONE:    'bg-emerald-500 border-emerald-600',
  FAILED:  'bg-red-500 border-red-600',
  BLOCKED: 'bg-orange-400 border-orange-600',
};

const LINE_CLASSES: Record<PipelineStatus, string> = {
  IDLE:    'bg-muted',
  RUNNING: 'bg-blue-200',
  DONE:    'bg-emerald-400',
  FAILED:  'bg-red-200',
  BLOCKED: 'bg-orange-200',
};

export function PipelineProgressBar({ stages, onStageClick }: PipelineProgressBarProps) {
  return (
    <div className="flex items-center gap-0">
      {STAGE_ORDER.map((stage, idx) => {
        const stageData = stages[stage];
        const status = stageData?.status ?? 'IDLE';
        const cfg = STAGE_CONFIG[stage];

        return (
          <div key={stage} className="flex items-center">
            {/* Dot */}
            <button
              title={`${cfg.icon} ${cfg.label}: ${status}`}
              onClick={() => onStageClick?.(stage)}
              className={cn(
                'w-4 h-4 rounded-full border-2 transition-all hover:scale-125 cursor-pointer',
                DOT_CLASSES[status]
              )}
            />
            {/* Connector line */}
            {idx < STAGE_ORDER.length - 1 && (
              <div className={cn('w-8 h-0.5', LINE_CLASSES[status])} />
            )}
          </div>
        );
      })}
    </div>
  );
}
