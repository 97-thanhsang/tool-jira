'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { usePipelineTasks } from '@/hooks/use-pipeline';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { STAGE_CONFIG } from '@/types/opencode';
import type { PipelineStage } from '@/types/opencode';
import { DecomposePanel } from './stages/decompose-panel';
import { ExtractorPanel } from './stages/extractor-panel';
import { AnalyzePanel } from './stages/analyze-panel';
import { SolutionPanel } from './stages/solution-panel';
import { ExecutePanel } from './stages/execute-panel';

interface StageScreenProps {
  stage: PipelineStage;
}

export function StageScreen({ stage }: StageScreenProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { taskKeys } = usePipelineTasks();

  const taskFromUrl = searchParams.get('task') ?? '';
  const [inputValue, setInputValue] = useState(taskFromUrl);
  const [activeTask, setActiveTask] = useState(taskFromUrl);

  useEffect(() => {
    setInputValue(taskFromUrl);
    setActiveTask(taskFromUrl);
  }, [taskFromUrl]);

  const cfg = STAGE_CONFIG[stage];

  const handleLoad = () => {
    const key = inputValue.trim().toUpperCase();
    if (!key) return;
    router.push(`${pathname}?task=${key}`);
    setActiveTask(key);
  };

  const handleTaskChip = (key: string) => {
    setInputValue(key);
    router.push(`${pathname}?task=${key}`);
    setActiveTask(key);
  };

  return (
    <div className="space-y-6">
      {/* Stage header */}
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <span>{cfg.icon}</span>
          <span>{cfg.label}</span>
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">{cfg.description}</p>
      </div>

      {/* Task selector */}
      <div className="flex flex-wrap items-center gap-3 p-4 rounded-lg border bg-muted/30">
        <span className="text-sm font-medium shrink-0">Task Key:</span>
        <div className="flex gap-2">
          <Input
            placeholder="EMSPRO2-1234"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLoad()}
            className="font-mono w-44"
          />
          <Button onClick={handleLoad} size="sm" disabled={!inputValue.trim()}>
            Load
          </Button>
        </div>

        {/* Recent tasks */}
        {taskKeys.length > 0 && (
          <div className="flex gap-1.5 flex-wrap items-center">
            <span className="text-xs text-muted-foreground">Recent:</span>
            {taskKeys.slice(0, 6).map((key) => (
              <button
                key={key}
                onClick={() => handleTaskChip(key)}
                className="text-xs font-mono px-2 py-0.5 rounded-full bg-background border hover:bg-muted transition-colors"
              >
                {key}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Panel content */}
      {activeTask ? (
        <div>
          {stage === 'decompose' && <DecomposePanel taskKey={activeTask} />}
          {stage === 'extractor' && <ExtractorPanel taskKey={activeTask} />}
          {stage === 'analyze'   && <AnalyzePanel   taskKey={activeTask} />}
          {stage === 'solution'  && <SolutionPanel  taskKey={activeTask} />}
          {stage === 'execute'   && <ExecutePanel   taskKey={activeTask} />}
        </div>
      ) : (
        <div className="text-center py-20 text-muted-foreground rounded-lg border border-dashed">
          <p className="text-4xl mb-3">{cfg.icon}</p>
          <p className="font-medium">Nhập Task Key để bắt đầu</p>
          <p className="text-sm mt-1">
            Ví dụ:{' '}
            <code className="text-xs bg-muted px-1.5 py-0.5 rounded">EMSPRO2-1234</code>
          </p>
        </div>
      )}
    </div>
  );
}
