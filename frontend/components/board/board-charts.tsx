'use client';
import { useState } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { JiraIssue } from '@/types/jira';

// ─── Color maps ───────────────────────────────────────────────────────────────

const PRIORITY_COLORS: Record<string, string> = {
  Highest: '#DE350B',
  Blocker: '#DE350B',
  High:    '#FF5630',
  Medium:  '#FFAB00',
  Low:     '#2684FF',
  Lowest:  '#2684FF',
  Minor:   '#6B778C',
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface BoardChartsProps {
  grouped: {
    todo:       JiraIssue[];
    inProgress: JiraIssue[];
    done:       JiraIssue[];
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export function BoardCharts({ grouped }: BoardChartsProps) {
  const [expanded, setExpanded] = useState(false);

  const allIssues = [...grouped.todo, ...grouped.inProgress, ...grouped.done];

  // ── Status donut ────────────────────────────────────────────────────────────
  const statusData = [
    { name: 'To Do',       value: grouped.todo.length,       color: '#5E6C84' },
    { name: 'In Progress', value: grouped.inProgress.length, color: '#0052CC' },
    { name: 'Done',        value: grouped.done.length,       color: '#36B37E' },
  ].filter((d) => d.value > 0);

  // ── Priority bar ────────────────────────────────────────────────────────────
  const priorityMap: Record<string, number> = {};
  for (const issue of allIssues) {
    const p = issue.fields.priority.name;
    priorityMap[p] = (priorityMap[p] ?? 0) + 1;
  }
  const priorityData = Object.entries(priorityMap).map(([name, value]) => ({
    name,
    value,
    fill: PRIORITY_COLORS[name] ?? '#8884d8',
  }));

  // ── Project bar (top 5) ─────────────────────────────────────────────────────
  const projectMap: Record<string, { label: string; value: number }> = {};
  for (const issue of allIssues) {
    const k = issue.fields.project.key;
    if (!projectMap[k]) projectMap[k] = { label: issue.fields.project.name, value: 0 };
    projectMap[k].value++;
  }
  const projectData = Object.values(projectMap)
    .sort((a, b) => b.value - a.value)
    .slice(0, 5)
    .map((p) => ({
      name:  p.label.length > 12 ? p.label.slice(0, 12) + '…' : p.label,
      value: p.value,
    }));

  return (
    <div className="mb-4 flex-shrink-0">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setExpanded((v) => !v)}
        className="border-[#DFE1E6] dark:border-gray-700 text-[#5E6C84] dark:text-gray-400 hover:bg-[#F4F5F7] dark:hover:bg-gray-800"
      >
        {expanded ? (
          <ChevronUp size={14} className="mr-1.5" />
        ) : (
          <ChevronDown size={14} className="mr-1.5" />
        )}
        {expanded ? 'Hide Stats' : 'Show Stats'}
      </Button>

      {expanded && (
        <div className="mt-3 grid grid-cols-3 gap-4 bg-white dark:bg-gray-800 rounded-lg border border-[#DFE1E6] dark:border-gray-700 p-4">
          {/* 1. Donut — by Status */}
          <div>
            <p className="text-xs font-semibold text-[#5E6C84] dark:text-gray-400 mb-2 text-center">
              By Status
            </p>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={65}
                  dataKey="value"
                  stroke="transparent"
                >
                  {statusData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* 2. Bar — by Priority */}
          <div>
            <p className="text-xs font-semibold text-[#5E6C84] dark:text-gray-400 mb-2 text-center">
              By Priority
            </p>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart
                data={priorityData}
                margin={{ top: 4, right: 4, left: -24, bottom: 0 }}
              >
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 9, fill: '#5E6C84' }}
                  interval={0}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 9, fill: '#5E6C84' }}
                  allowDecimals={false}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip contentStyle={{ fontSize: 11 }} />
                <Bar dataKey="value" radius={[3, 3, 0, 0]}>
                  {priorityData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* 3. Bar — by Project (top 5) */}
          <div>
            <p className="text-xs font-semibold text-[#5E6C84] dark:text-gray-400 mb-2 text-center">
              By Project (top 5)
            </p>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart
                data={projectData}
                margin={{ top: 4, right: 4, left: -24, bottom: 0 }}
              >
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 9, fill: '#5E6C84' }}
                  interval={0}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 9, fill: '#5E6C84' }}
                  allowDecimals={false}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip contentStyle={{ fontSize: 11 }} />
                <Bar dataKey="value" fill="#0052CC" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
