'use client';

import { useState, useCallback, useEffect } from 'react';
import { CalendarDays } from 'lucide-react';
import { useWorkEst } from '@/hooks/use-work-est';
import { FilterBar } from '@/components/shared/filter-bar';
import type { UnifiedFilters } from '@/lib/filter-constants';
import { EstTaskSelector } from '@/components/work-est/est-task-selector';
import { EstSubTaskTable } from '@/components/work-est/est-sub-task-table';
import { EstTimeline } from '@/components/work-est/est-timeline';
import { EstActionButtons } from '@/components/work-est/est-apply-button';

export default function WorkEstPage() {
  const [parentKeys, setParentKeys] = useState<string[]>([]);

  const {
    subTasks, filteredCount, totalCount, isLoading, filters, setFilters,
    selectedIds, toggleSelection, toggleSelectAll, isAllSelected,
    manualEstimates, setManualEstimate,
    dateRange, setDateRange,
    distribution, runDistribution, resetDistribution, hasDistributed,
  } = useWorkEst(parentKeys);

  // Set default filters after mount (mirror My Issues)
  useEffect(() => {
    setFilters(prev => ({
      ...prev,
      statusIn: ['Cancelled', 'Closed', 'Done', 'Rejected'],
      statusExclude: true,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAddParent = useCallback((key: string) => setParentKeys(prev => [...prev, key]), []);
  const handleRemoveParent = useCallback((key: string) => setParentKeys(prev => prev.filter(k => k !== key)), []);

  const canDistribute = selectedIds.size > 0 && !!dateRange.from && !!dateRange.to;

  return (
    <div className="flex flex-col gap-4 p-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <CalendarDays size={24} className="text-[#0052CC]" />
        <h1 className="text-xl font-bold text-[#172B4D] dark:text-gray-100">Work Estimate Schedule</h1>
        <span className="text-xs text-[#5E6C84] dark:text-gray-400 bg-[#F4F5F7] dark:bg-gray-800 px-2 py-0.5 rounded">Lập kế hoạch & phân bổ estimate</span>
      </div>

      {/* Step 1: Task Selector */}
      <div className="space-y-1">
        <div className="flex items-center gap-3 mb-1">
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#0052CC] text-white text-[11px] font-bold leading-none">1</span>
          <span className="text-xs font-semibold text-[#172B4D] dark:text-gray-200 uppercase tracking-wide">Chọn parent tasks</span>
        </div>
        <EstTaskSelector
          parentKeys={parentKeys}
          onAddParent={handleAddParent}
          onRemoveParent={handleRemoveParent}
        />
      </div>

      {/* Step 2: Filters + Table */}
      {totalCount > 0 && (
        <div className="space-y-1">
          <div className="flex items-center gap-3 mb-1">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#0052CC] text-white text-[11px] font-bold leading-none">2</span>
            <span className="text-xs font-semibold text-[#172B4D] dark:text-gray-200 uppercase tracking-wide">Lọc & chọn sub-tasks</span>
            <span className="text-[11px] text-[#5E6C84] dark:text-gray-400">({selectedIds.size}/{filteredCount} chọn, {totalCount} tổng)</span>
          </div>
          <FilterBar
            filters={filters}
            onChange={(f: UnifiedFilters) => setFilters(f)}
          />
          <EstSubTaskTable
            subTasks={subTasks}
            selectedIds={selectedIds}
            isAllSelected={isAllSelected}
            onToggleSelection={toggleSelection}
            onToggleSelectAll={toggleSelectAll}
            manualEstimates={manualEstimates}
            onSetManualEstimate={setManualEstimate}
          />
        </div>
      )}

      {/* Step 3: Date Range + Action Buttons (gộp — hàng ngang) */}
      <div className="space-y-1">
        <div className="flex items-center gap-3 mb-1">
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#0052CC] text-white text-[11px] font-bold leading-none">3</span>
          <span className="text-xs font-semibold text-[#172B4D] dark:text-gray-200 uppercase tracking-wide">Khoảng thời gian & phân bổ</span>
        </div>
        <div className="flex items-center gap-4 flex-wrap bg-white dark:bg-gray-900 border border-[#DFE1E6] dark:border-gray-700 rounded-lg p-4">
          {/* Trái: chọn ngày */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-[#5E6C84] dark:text-gray-400 uppercase tracking-wide shrink-0">Từ</label>
              <input type="date" value={dateRange.from}
                onChange={e => setDateRange({ ...dateRange, from: e.target.value })}
                className="px-3 py-1.5 text-sm border border-[#DFE1E6] dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-[#172B4D] dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0052CC] w-[140px]" />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-[#5E6C84] dark:text-gray-400 uppercase tracking-wide shrink-0">Đến</label>
              <input type="date" value={dateRange.to}
                onChange={e => setDateRange({ ...dateRange, to: e.target.value })}
                className="px-3 py-1.5 text-sm border border-[#DFE1E6] dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-[#172B4D] dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0052CC] w-[140px]" />
            </div>
          </div>

          {/* Giữa: thông tin */}
          {(() => {
            const days = (() => {
              const s = new Date(dateRange.from + 'T00:00:00');
              const e = new Date(dateRange.to + 'T00:00:00');
              let c = 0; const cur = new Date(s);
              while (cur <= e) { const d = cur.getDay(); if (d !== 0 && d !== 6) c++; cur.setDate(cur.getDate() + 1); }
              return c;
            })();
            return (
              <div className="flex items-center gap-2 text-xs text-[#5E6C84] dark:text-gray-400">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#DEEBFF] dark:bg-blue-900/30 text-[#0052CC] dark:text-blue-300 rounded-full font-medium">
                  {days} ngày
                </span>
                <span className="font-semibold text-[#172B4D] dark:text-gray-200">{days * 8}h khả dụng</span>
                <span className="text-[10px]">(Bỏ T7/CN)</span>
              </div>
            );
          })()}

          {/* Phải: buttons */}
          <div className="flex items-center gap-2 ml-auto">
            <EstActionButtons
              schedule={distribution?.schedule ?? []}
              canDistribute={canDistribute}
              hasDistributed={hasDistributed}
              dateLabel={`${dateRange.from} → ${dateRange.to}`}
              onDistribute={runDistribution}
              onReset={resetDistribution}
              compact
            />
          </div>
        </div>
      </div>

      {/* Step 4: Timeline */}
      {distribution && (
        <div className="space-y-1">
          <div className="flex items-center gap-3 mb-1">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#0052CC] text-white text-[11px] font-bold leading-none">4</span>
            <span className="text-xs font-semibold text-[#172B4D] dark:text-gray-200 uppercase tracking-wide">Timeline phân bổ</span>
          </div>
        <EstTimeline
          schedule={distribution.schedule}
          workingDays={distribution.workingDays}
        />
        </div>
      )}
    </div>
  );
}
