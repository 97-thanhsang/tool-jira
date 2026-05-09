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
import { AlertCircle } from 'lucide-react';

import type { JiraIssue } from '@/types/jira';
import type { ColumnId } from '@/lib/transitions';
import { IssueCard } from './issue-card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface BoardColumn {
  id: string;
  label: string;
  issues: JiraIssue[];
  color: string;
  wipLimit?: number | null;
}

interface KanbanBoardProps {
  columns: BoardColumn[];
  isLoading: boolean;
  moveCard?: (
    issueId: string,
    issueKey: string,
    targetColumnId: ColumnId,
    targetLabel: string,
  ) => void;
  onCardClick?: (key: string) => void;
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function ColumnSkeleton() {
  return (
    <div className="space-y-2">
      {[1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-24 w-full rounded-sm" />
      ))}
    </div>
  );
}

// ─── Sortable card wrapper ────────────────────────────────────────────────────

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

// ─── Droppable column ─────────────────────────────────────────────────────────

function DroppableColumn({
  col,
  isLoading,
  onCardClick,
}: {
  col: BoardColumn;
  isLoading: boolean;
  onCardClick?: (key: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: col.id });
  const issueIds = col.issues.map((i) => i.id);

  const overWip = col.wipLimit != null && col.issues.length > col.wipLimit;

  return (
    <div className="flex flex-col min-h-0">
      {/* Column header */}
      <div className="flex items-center gap-2 mb-3 px-1 flex-shrink-0">
        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: col.color }} />
        <h3 className="text-xs font-semibold text-[#5E6C84] dark:text-gray-400 uppercase tracking-wider">
          {col.label}
        </h3>
        <span
          className={cn(
            'ml-auto text-xs px-1.5 py-0.5 rounded-full flex items-center gap-0.5',
            overWip
              ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 font-semibold'
              : 'text-[#5E6C84] dark:text-gray-400 bg-[#DFE1E6] dark:bg-gray-700',
          )}
        >
          {overWip && <AlertCircle size={10} />}
          {col.issues.length}
          {col.wipLimit != null ? `/${col.wipLimit}` : ''}
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
        ) : col.issues.length === 0 ? (
          <div className="text-center py-8 text-xs text-[#5E6C84] dark:text-gray-500">
            No issues
          </div>
        ) : (
          <SortableContext items={issueIds} strategy={verticalListSortingStrategy}>
            {col.issues.map((issue) => (
              <SortableCard key={issue.id} issue={issue} onCardClick={onCardClick} />
            ))}
          </SortableContext>
        )}
      </div>
    </div>
  );
}

// ─── Main board ───────────────────────────────────────────────────────────────

export function KanbanBoard({
  columns,
  isLoading,
  moveCard,
  onCardClick,
}: KanbanBoardProps) {
  const [activeIssue, setActiveIssue] = useState<JiraIssue | null>(null);

  function handleDragStart(event: DragStartEvent) {
    const id = String(event.active.id);
    for (const col of columns) {
      const found = col.issues.find((i) => i.id === id);
      if (found) {
        setActiveIssue(found);
        return;
      }
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveIssue(null);
    if (!over) return;

    const activeId = String(active.id);
    const overId   = String(over.id);

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

    moveCard?.(activeId, sourceIssue.key, targetCol.id as ColumnId, targetCol.label);
  }

  function handleDragCancel() {
    setActiveIssue(null);
  }

  return (
    <DndContext
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="grid grid-cols-3 gap-4 h-full">
        {columns.map((col) => (
          <DroppableColumn
            key={col.id}
            col={col}
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
