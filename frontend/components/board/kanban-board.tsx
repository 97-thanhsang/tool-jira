'use client';
import { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { AlertCircle, TrendingDown } from 'lucide-react';

import type { JiraIssue } from '@/types/jira';
import { IssueCard } from './issue-card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface BoardColumn {
  id: string;
  label: string;
  issues: JiraIssue[];
  color: string;
  wipMin?: number;
  wipMax?: number;
  /** Status IDs mapped to this column (from board config). Used for transitions. */
  statusIds: string[];
}

/** Column definition metadata (without issues array). */
export interface BoardColumnDef {
  id: string;
  label: string;
  color: string;
  wipMin?: number;
  wipMax?: number;
  statusIds: string[];
}

/** Move handler: called when a card is dropped into a target column. */
export type MoveCardFn = (
  issueId: string,
  issueKey: string,
  targetColumnName: string,
  targetLabel: string,
  targetStatusIds?: string[],
) => void;

/** Separator for composite droppable IDs in swimlane mode. */
const SWIMLANE_SEP = '|||';
function makeSwimlaneColId(laneKey: string, colId: string): string {
  return `${laneKey}${SWIMLANE_SEP}${colId}`;
}
function parseSwimlaneColId(compositeId: string): {
  laneKey: string;
  colId: string;
} | null {
  const idx = compositeId.indexOf(SWIMLANE_SEP);
  if (idx === -1) return null;
  return {
    laneKey: compositeId.substring(0, idx),
    colId: compositeId.substring(idx + SWIMLANE_SEP.length),
  };
}

interface KanbanBoardProps {
  columns: BoardColumn[];
  isLoading: boolean;
  moveCard?: MoveCardFn;
  onCardClick?: (key: string) => void;
  /** Swimlane data: each lane has a key and columns map (label → issues). */
  swimlanes?: {
    key: string;
    columns: Record<string, JiraIssue[]>;
  }[];
  /** Column definitions (metadata only) — required when swimlanes are used. */
  columnDefs?: BoardColumnDef[];
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

function ColumnSkeleton() {
  return (
    <div className="space-y-2">
      {[1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-24 w-full rounded-sm" />
      ))}
    </div>
  );
}

// ─── Sortable card wrapper ───────────────────────────────────────────────────

function SortableCard({
  issue,
  onCardClick,
}: {
  issue: JiraIssue;
  onCardClick?: (key: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: issue.id, data: { key: issue.key } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        'cursor-grab active:cursor-grabbing touch-none',
        isDragging && 'opacity-40',
      )}
    >
      <IssueCard issue={issue} onCardClick={onCardClick} />
    </div>
  );
}

// ─── Droppable column ────────────────────────────────────────────────────────

interface DroppableColumnProps {
  colId: string;
  label: string;
  color: string;
  wipMin?: number;
  wipMax?: number;
  issues: JiraIssue[];
  isLoading: boolean;
  onCardClick?: (key: string) => void;
}

function DroppableColumn({
  colId,
  label,
  color,
  wipMin,
  wipMax,
  issues,
  isLoading,
  onCardClick,
}: DroppableColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: colId });
  const issueIds = issues.map((i) => i.id);

  const count = issues.length;
  const overMax = wipMax != null && count > wipMax;
  const underMin = wipMin != null && count < wipMin;

  return (
    <div className="flex flex-col min-h-0">
      {/* Column header */}
      <div className="flex items-center gap-2 mb-3 px-1 flex-shrink-0">
        <div
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: color }}
        />
        <h3 className="text-xs font-semibold text-[#5E6C84] dark:text-gray-400 uppercase tracking-wider">
          {label}
        </h3>
        <span
          className={cn(
            'ml-auto text-xs px-1.5 py-0.5 rounded-full flex items-center gap-0.5',
            overMax
              ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 font-semibold'
              : underMin
                ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 font-semibold'
                : 'text-[#5E6C84] dark:text-gray-400 bg-[#DFE1E6] dark:bg-gray-700',
          )}
        >
          {overMax && <AlertCircle size={10} />}
          {underMin && <TrendingDown size={10} />}
          {count}
          {wipMax != null ? `/${wipMax}` : ''}
        </span>
      </div>

      {/* Cards area — droppable zone */}
      <div
        ref={setNodeRef}
        className={cn(
          'flex-1 space-y-2 overflow-y-auto pr-1 rounded transition-colors min-h-[80px]',
          isOver &&
            'bg-[#DEEBFF] dark:bg-blue-900/20 outline outline-2 outline-dashed outline-[#0052CC] dark:outline-blue-500',
        )}
      >
        {isLoading ? (
          <ColumnSkeleton />
        ) : issues.length === 0 ? (
          <div className="text-center py-8 text-xs text-[#5E6C84] dark:text-gray-500">
            No issues
          </div>
        ) : (
          <SortableContext
            items={issueIds}
            strategy={verticalListSortingStrategy}
          >
            {issues.map((issue) => (
              <SortableCard
                key={issue.id}
                issue={issue}
                onCardClick={onCardClick}
              />
            ))}
          </SortableContext>
        )}
      </div>
    </div>
  );
}

// ─── Helpers for drag resolution ─────────────────────────────────────────────

/** Walk all columns to find an issue — used in flat (no-swimlane) mode. */
function findIssueAndCol(
  columns: BoardColumn[],
  issueId: string,
): { issue: JiraIssue; col: BoardColumn } | null {
  for (const col of columns) {
    const issue = col.issues.find((i) => i.id === issueId);
    if (issue) return { issue, col };
  }
  return null;
}

/** Walk all swimlanes to find an issue and its column label. */
function findIssueInSwimlanes(
  swimlanes: NonNullable<KanbanBoardProps['swimlanes']>,
  issueId: string,
): {
  issue: JiraIssue;
  colLabel: string;
  colId: string;
  colDef: BoardColumnDef;
} | null {
  for (const lane of swimlanes) {
    for (const [colLabel, issues] of Object.entries(lane.columns)) {
      const issue = issues.find((i) => i.id === issueId);
      if (issue) {
        // We don't have colDef reference here — caller must look it up
        return {
          issue,
          colLabel,
          colId: makeSwimlaneColId(lane.key, colLabel.toLowerCase().replace(/\s+/g, '-')),
          colDef: null as unknown as BoardColumnDef, // placeholder, caller must fill
        };
      }
    }
  }
  return null;
}

// ─── Main board ──────────────────────────────────────────────────────────────

export function KanbanBoard({
  columns,
  isLoading,
  moveCard,
  onCardClick,
  swimlanes,
  columnDefs,
}: KanbanBoardProps) {
  const [activeIssue, setActiveIssue] = useState<JiraIssue | null>(null);
  const hasSwimlanes = !!swimlanes && swimlanes.length > 0;

  function handleDragStart(event: DragStartEvent) {
    const id = String(event.active.id);

    if (hasSwimlanes) {
      for (const lane of swimlanes!) {
        for (const issues of Object.values(lane.columns)) {
          const found = issues.find((i) => i.id === id);
          if (found) {
            setActiveIssue(found);
            return;
          }
        }
      }
    } else {
      for (const col of columns) {
        const found = col.issues.find((i) => i.id === id);
        if (found) {
          setActiveIssue(found);
          return;
        }
      }
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveIssue(null);
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    if (hasSwimlanes) {
      // Swimlane mode: over.id is composite "laneKey|||colId"
      const parsed = parseSwimlaneColId(overId);
      // Also try as raw column id (dropped onto a card in a flat column context)
      if (!parsed) return;
      const targetColDef = columnDefs?.find((d) => d.id === parsed.colId);
      if (!targetColDef) return;

      // Find source issue + column
      let sourceIssue: JiraIssue | undefined;
      let sourceColLabel: string | undefined;
      for (const lane of swimlanes!) {
        for (const [colLabel, issues] of Object.entries(lane.columns)) {
          const issue = issues.find((i) => i.id === activeId);
          if (issue) {
            sourceIssue = issue;
            sourceColLabel = colLabel;
            break;
          }
        }
        if (sourceIssue) break;
      }
      if (!sourceIssue) return;

      // If same column (same lane + same column), skip
      // sourceColLabel === targetColDef.label compares logical column name
      if (sourceColLabel === targetColDef.label) return;

      moveCard?.(
        activeId,
        sourceIssue.key,
        targetColDef.label,
        targetColDef.label,
        targetColDef.statusIds.length > 0
          ? targetColDef.statusIds
          : undefined,
      );
      return;
    }

    // ── Flat mode (no swimlanes) — original logic ──────────────────────

    // Resolve target column: over might be a column id OR a card id
    let targetCol = columns.find((c) => c.id === overId);
    if (!targetCol) {
      for (const col of columns) {
        if (col.issues.some((i) => i.id === overId)) {
          targetCol = col;
          break;
        }
      }
    }
    if (!targetCol) return;

    // Find source issue + column
    let sourceIssue: JiraIssue | undefined;
    let sourceColId: string | undefined;
    for (const col of columns) {
      const issue = col.issues.find((i) => i.id === activeId);
      if (issue) {
        sourceIssue = issue;
        sourceColId = col.id;
        break;
      }
    }
    if (!sourceIssue || sourceColId === targetCol.id) return;

    moveCard?.(
      activeId,
      sourceIssue.key,
      targetCol.label,
      targetCol.label,
      targetCol.statusIds.length > 0 ? targetCol.statusIds : undefined,
    );
  }

  function handleDragCancel() {
    setActiveIssue(null);
  }

  // ─── Swimlane render ──────────────────────────────────────────────────

  if (hasSwimlanes) {
    return (
      <DndContext
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="flex flex-col gap-6 overflow-y-auto h-full pr-2">
          {swimlanes!.map((lane) => (
            <div key={lane.key} className="flex-shrink-0">
              {/* Swimlane header */}
              <div className="flex items-center gap-2 mb-2 px-1">
                <h4 className="text-sm font-semibold text-[#172B4D] dark:text-gray-200">
                  {lane.key}
                </h4>
                <span className="text-xs text-[#5E6C84] dark:text-gray-400 bg-[#DFE1E6] dark:bg-gray-700 px-2 py-0.5 rounded-full">
                  {Object.values(lane.columns).reduce(
                    (sum, issues) => sum + issues.length,
                    0,
                  )}
                </span>
              </div>
              {/* Column grid for this swimlane */}
              <div
                className="grid gap-4"
                style={{
                  gridTemplateColumns: `repeat(${columnDefs?.length ?? 3}, minmax(0, 1fr))`,
                }}
              >
                {(columnDefs ?? []).map((colDef) => {
                  const issues = lane.columns[colDef.label] || [];
                  return (
                    <DroppableColumn
                      key={`${lane.key}-${colDef.id}`}
                      colId={makeSwimlaneColId(lane.key, colDef.id)}
                      label={colDef.label}
                      color={colDef.color}
                      wipMin={colDef.wipMin}
                      wipMax={colDef.wipMax}
                      issues={issues}
                      isLoading={isLoading}
                      onCardClick={onCardClick}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Drag overlay */}
        <DragOverlay>
          {activeIssue && (
            <div className="rotate-1 opacity-90 shadow-2xl">
              <IssueCard issue={activeIssue} />
            </div>
          )}
        </DragOverlay>
      </DndContext>
    );
  }

  // ─── Flat render (no swimlanes) ───────────────────────────────────────

  // Dynamic grid: use inline style since Tailwind JIT can't handle dynamic classes
  const gridStyle = {
    gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))`,
  };

  return (
    <DndContext
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="grid gap-4 h-full" style={gridStyle}>
        {columns.map((col) => (
          <DroppableColumn
            key={col.id}
            colId={col.id}
            label={col.label}
            color={col.color}
            wipMin={col.wipMin}
            wipMax={col.wipMax}
            issues={col.issues}
            isLoading={isLoading}
            onCardClick={onCardClick}
          />
        ))}
      </div>

      {/* Drag overlay — ghost card following the cursor */}
      <DragOverlay>
        {activeIssue && (
          <div className="rotate-1 opacity-90 shadow-2xl">
            <IssueCard issue={activeIssue} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
