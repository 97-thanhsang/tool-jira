'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import { usePipelineTasks, usePipelineSummary } from '@/hooks/use-pipeline';
import { PipelineProgressBar } from './pipeline-progress-bar';

// ─── Row component (loads its own summary) ───────────────────────────────────
function PipelineRow({ taskKey }: { taskKey: string }) {
  const { summary } = usePipelineSummary(taskKey);
  const router = useRouter();

  const completedCount = summary
    ? Object.values(summary.stages).filter((s) => s.status === 'DONE').length
    : 0;

  return (
    <TableRow
      className="cursor-pointer hover:bg-muted/50"
      onClick={() => router.push(`/opencode/${taskKey}`)}
    >
      <TableCell className="font-mono font-medium">{taskKey}</TableCell>
      <TableCell>
        {summary ? (
          <PipelineProgressBar
            stages={summary.stages}
            onStageClick={(stage) => {
              router.push(`/opencode/${taskKey}?stage=${stage}`);
            }}
          />
        ) : (
          <div className="h-4 w-40 bg-muted animate-pulse rounded" />
        )}
      </TableCell>
      <TableCell className="text-muted-foreground text-sm">
        {completedCount}/5 stages
      </TableCell>
      <TableCell>
        <Button variant="ghost" size="sm">
          View →
        </Button>
      </TableCell>
    </TableRow>
  );
}

// ─── Main Hub ─────────────────────────────────────────────────────────────────
export function PipelineHub() {
  const { taskKeys, isLoading, refresh } = usePipelineTasks();
  const [search, setSearch] = useState('');
  const [manualKey, setManualKey] = useState('');

  const filtered = taskKeys.filter((k) =>
    k.toLowerCase().includes(search.toLowerCase())
  );

  const handleAddKey = () => {
    const key = manualKey.trim().toUpperCase();
    if (key && /^[A-Z]+-\d+$/.test(key)) {
      window.location.href = `/opencode/${key}`;
    }
    setManualKey('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">⚡ OpenCode Pipeline Hub</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Theo dõi và quản lý pipeline AI cho các Jira tasks
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refresh()}>
          🔄 Làm mới
        </Button>
      </div>

      {/* Pipeline Legend */}
      <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg text-xs text-muted-foreground flex-wrap">
        <span className="font-medium">Legend:</span>
        {[
          { color: 'bg-emerald-500', label: 'DONE' },
          { color: 'bg-blue-400 animate-pulse', label: 'RUNNING' },
          { color: 'bg-muted border', label: 'IDLE' },
          { color: 'bg-red-500', label: 'FAILED' },
          { color: 'bg-orange-400', label: 'BLOCKED' },
        ].map(({ color, label }) => (
          <span key={label} className="flex items-center gap-1.5">
            <span className={`w-3 h-3 rounded-full border ${color}`} />
            {label}
          </span>
        ))}
        <span className="ml-4">🔍 Decompose · 📦 Extractor · 🧠 Analyze · 🏗️ Solution · ⚡ Execute</span>
      </div>

      {/* Search + Add */}
      <div className="flex gap-3 flex-wrap">
        <Input
          placeholder="Tìm theo task key (EMSPRO2-...)..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <div className="flex gap-2 ml-auto">
          <Input
            placeholder="Thêm task key..."
            value={manualKey}
            onChange={(e) => setManualKey(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddKey()}
            className="w-44"
          />
          <Button onClick={handleAddKey} variant="outline">
            + Thêm
          </Button>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-14 bg-muted animate-pulse rounded" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-4xl mb-3">⚡</p>
          <p className="font-medium">Chưa có pipeline nào</p>
          <p className="text-sm mt-1">
            Chạy <code>/analyze-task EMSPRO2-1234</code> trong OpenCode CLI để bắt đầu,
            hoặc thêm task key thủ công ở trên.
          </p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-36">Task Key</TableHead>
              <TableHead>Pipeline Progress</TableHead>
              <TableHead className="w-28">Tiến độ</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((key) => (
              <PipelineRow key={key} taskKey={key} />
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
