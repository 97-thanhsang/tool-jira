'use client';
import { useState } from 'react';
import { ChevronDown, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import type { JiraTransition } from '@/types/jira';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface TransitionButtonProps {
  issueKey: string;
  currentStatus: string;
  onTransitioned: () => void;
}

export function TransitionButton({
  issueKey,
  currentStatus,
  onTransitioned,
}: TransitionButtonProps) {
  const [transitions, setTransitions] = useState<JiraTransition[]>([]);
  const [loading, setLoading] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [open, setOpen] = useState(false);
  const [transitionError, setTransitionError] = useState<string | null>(null);

  async function loadTransitions() {
    if (transitions.length > 0) return;
    setLoading(true);
    try {
      const res = await api.get<{ transitions: JiraTransition[] }>(
        `/issue/${issueKey}/transitions`
      );
      setTransitions(res.data.transitions);
    } finally {
      setLoading(false);
    }
  }

  async function doTransition(transition: JiraTransition) {
    setTransitioning(true);
    setTransitionError(null);
    setOpen(false);
    try {
      await api.post(`/issue/${issueKey}/transitions`, {
        transition: { id: transition.id },
      });
      onTransitioned();
    } catch {
      setTransitionError('Failed to transition. Please try again.');
    } finally {
      setTransitioning(false);
    }
  }

  return (
    <>
      <DropdownMenu
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (v) loadTransitions();
      }}
    >
      <DropdownMenuTrigger
        disabled={transitioning}
        className="inline-flex w-full items-center justify-between rounded-md border border-[#DFE1E6] bg-white px-2 text-[#172B4D] text-xs h-8 hover:bg-[#F4F5F7] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {transitioning ? (
          <Loader2 size={12} className="animate-spin" />
        ) : (
          <span className="truncate">{currentStatus}</span>
        )}
        <ChevronDown size={12} className="ml-1 flex-shrink-0" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        {loading ? (
          <DropdownMenuItem disabled>Loading…</DropdownMenuItem>
        ) : transitions.length === 0 ? (
          <DropdownMenuItem disabled>No transitions available</DropdownMenuItem>
        ) : (
          transitions.map((t) => (
            <DropdownMenuItem
              key={t.id}
              onClick={() => doTransition(t)}
              className="text-sm"
            >
              → {t.name}
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
    {transitionError && (
      <p className="text-xs text-red-600 mt-1">{transitionError}</p>
    )}
    </>
  );
}
