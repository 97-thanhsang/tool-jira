import { useState, useCallback, useMemo } from 'react';
import { useMyIssues } from './use-my-issues';
import { moveIssue, type ColumnId } from '@/lib/transitions';
import type { JiraIssue } from '@/types/jira';

export interface BoardToast {
  message: string;
  type: 'success' | 'error';
}

type OverrideMap = Record<string, ColumnId>;

export function useBoardState() {
  const { grouped: rawGrouped, total, isLoading, error, mutate } = useMyIssues();
  const [overrides, setOverrides] = useState<OverrideMap>({});
  const [toast, setToast]         = useState<BoardToast | null>(null);

  // Combine all raw issues for override resolution
  const allIssues = useMemo<JiraIssue[]>(
    () => [...rawGrouped.todo, ...rawGrouped.inProgress, ...rawGrouped.done],
    [rawGrouped],
  );

  // Apply local overrides on top of SWR data
  const grouped = useMemo(() => {
    const result: { todo: JiraIssue[]; inProgress: JiraIssue[]; done: JiraIssue[] } = {
      todo: [],
      inProgress: [],
      done: [],
    };

    for (const issue of allIssues) {
      const override = overrides[issue.id];
      if (override) {
        result[override].push(issue);
      } else {
        const cat = issue.fields.status.statusCategory.key;
        if      (cat === 'new')          result.todo.push(issue);
        else if (cat === 'indeterminate') result.inProgress.push(issue);
        else if (cat === 'done')          result.done.push(issue);
      }
    }

    return result;
  }, [allIssues, overrides]);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  /**
   * Optimistically move a card to a new column, call the Jira transition API,
   * and revert on failure.
   */
  const moveCard = useCallback(
    async (
      issueId: string,
      issueKey: string,
      targetColumnId: ColumnId,
      targetLabel: string,
    ) => {
      // Capture current effective column before optimistic update
      const prevOverride = overrides[issueId] as ColumnId | undefined;
      let naturalColumn: ColumnId | null = null;
      if (rawGrouped.todo.some((i) => i.id === issueId))       naturalColumn = 'todo';
      else if (rawGrouped.inProgress.some((i) => i.id === issueId)) naturalColumn = 'inProgress';
      else if (rawGrouped.done.some((i) => i.id === issueId))      naturalColumn = 'done';

      const effectivePrev = prevOverride ?? naturalColumn;
      if (effectivePrev === targetColumnId) return; // already there

      // Optimistic update
      setOverrides((prev) => ({ ...prev, [issueId]: targetColumnId }));

      try {
        await moveIssue(issueKey, targetColumnId);
        showToast(`${issueKey} moved to ${targetLabel}`, 'success');
        // Revalidate SWR, then clear override once fresh data arrives
        mutate().then(() => {
          setOverrides((prev) => {
            const next = { ...prev };
            delete next[issueId];
            return next;
          });
        });
      } catch {
        // Revert to previous position
        setOverrides((prev) => {
          const next = { ...prev };
          if (prevOverride) {
            next[issueId] = prevOverride;
          } else {
            delete next[issueId];
          }
          return next;
        });
        showToast(`Failed to move ${issueKey}`, 'error');
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rawGrouped, overrides, mutate],
  );

  return { grouped, total, isLoading, error, mutate, moveCard, toast };
}
