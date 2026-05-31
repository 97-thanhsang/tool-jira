'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { STAGE_CONFIG } from '@/types/opencode';
import { useServiceStatus } from '@/hooks/use-opencode-settings';
import type { PipelineStage } from '@/types/opencode';

const STAGE_ORDER: PipelineStage[] = ['decompose', 'extractor', 'analyze', 'solution', 'execute'];

export function OpenCodeStageNav() {
  const pathname = usePathname();
  const { status } = useServiceStatus();

  const isSettings = pathname === '/opencode/settings' || pathname.startsWith('/opencode/settings/');

  return (
    <div className="border-b bg-background">
      <div className="container mx-auto max-w-5xl px-4 flex items-center justify-between">
        {/* Stage tabs */}
        <nav className="flex overflow-x-auto">
          {STAGE_ORDER.map((stage) => {
            const cfg = STAGE_CONFIG[stage];
            const isActive =
              pathname === `/opencode/${stage}` ||
              pathname.startsWith(`/opencode/${stage}/`);

            return (
              <Link
                key={stage}
                href={`/opencode/${stage}`}
                className={cn(
                  'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors shrink-0',
                  isActive
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/40',
                )}
              >
                <span>{cfg.icon}</span>
                <span className="hidden sm:inline">{cfg.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Right side: service indicator + settings */}
        <div className="flex items-center gap-2 shrink-0 ml-2">
          {/* Service status dot */}
          <div
            title={status ? `OpenCode ${status.running ? 'running' : 'stopped'}` : 'Checking…'}
            className={cn(
              'w-2 h-2 rounded-full transition-colors',
              status?.running
                ? 'bg-emerald-500 shadow-[0_0_4px_#10b981]'
                : status
                ? 'bg-muted-foreground/40'
                : 'bg-muted-foreground/20 animate-pulse',
            )}
          />

          {/* Settings link */}
          <Link
            href="/opencode/settings"
            title="OpenCode Settings"
            className={cn(
              'p-2 rounded-md text-sm transition-colors',
              isSettings
                ? 'bg-muted text-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
            )}
          >
            ⚙️
          </Link>
        </div>
      </div>
    </div>
  );
}
