import { api } from './api';

// ─── Types ────────────────────────────────────────────────────────────────

export interface WorkEstSubTask {
  key: string;
  issueId: string;
  summary: string;
  issueTypeName: string;
  issueTypeIconUrl: string;
  projectKey: string;
  projectName: string;
  status: string;
  priority: string;
  assignee: string | null;
  assigneeDisplayName: string | null;
  assigneeAvatarUrl: string | null;
  reporter: string | null;
  reporterDisplayName: string | null;
  reporterAvatarUrl: string | null;
  originalEstimateSeconds: number;
  originalEstimateDisplay: string;
  loggedSeconds: number;
  loggedDisplay: string;
  duedate: string | null;
  created: string | null;
  updated: string | null;
  parentKey: string | null;
  parentSummary: string | null;
  parentIssueTypeName: string | null;
  parentIssueTypeIconUrl: string | null;
  parentStatus: string | null;
  // Manual override (hours, max 8)
  manualEstimateHours: number | null;
}

export interface ParentInfo {
  key: string;
  summary: string;
  issueTypeName: string;
  issueTypeIconUrl: string;
  status: string;
  duedate: string | null;
  estSeconds: number;
}

export interface WorkEstAllocation {
  issueKey: string;
  summary: string;
  projectKey: string;
  seconds: number;
  hours: number;
  status: string;
  priority: string;
  assigneeDisplayName: string | null;
  issueTypeName: string;
  issueTypeIconUrl: string;
}

export interface WorkEstDaySchedule {
  date: string;
  allocations: WorkEstAllocation[];
  totalSeconds: number;
  totalHours: number;
  existingSeconds: number;  // from unchecked sub-tasks with duedate=this date
  existingHours: number;
}

export interface WorkEstDistributeResult {
  schedule: WorkEstDaySchedule[];
  workingDays: string[];
  totalAvailableSeconds: number;
  totalAllocatedSeconds: number;
  totalExistingSeconds: number;
}

export interface SubTaskRaw {
  id: string;
  key: string;
  fields: {
    summary: string;
    issuetype: { name: string; iconUrl: string };
    project: { key: string; name: string };
    timetracking?: { originalEstimateSeconds: number };
    status: { name: string };
    priority: { name: string } | null;
    duedate: string | null;
    created: string;
    updated: string;
    assignee: {
      name: string;
      displayName: string;
      avatarUrls?: { '24x24': string };
    } | null;
    reporter: {
      name: string;
      displayName: string;
      avatarUrls?: { '24x24': string };
    } | null;
    worklog?: {
      worklogs: Array<{ timeSpentSeconds: number; author: { name: string } }>;
    };
    parent?: {
      key: string;
      fields: {
        summary: string;
        issuetype: { name: string; iconUrl: string };
        status?: { name: string; statusCategory?: { key: string } };
      };
    };
  };
}

function formatDuration(seconds: number): string {
  if (seconds === 0) return '-';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h >= 8 && h % 8 === 0 && m === 0) return `${h / 8}d`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/** Return YYYY-MM-DD in LOCAL timezone (not UTC) */
function localDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// ─── Fetch ─────────────────────────────────────────────────────────────────

export async function fetchSubTasks(
  parentKeys: string[],
): Promise<WorkEstSubTask[]> {
  if (parentKeys.length === 0) return [];

  const jql = `parent IN (${parentKeys.map(k => `"${k}"`).join(', ')}) ORDER BY priority DESC, duedate ASC`;

  const r = await api.get<{ issues: SubTaskRaw[] }>('/search', {
    params: {
      jql,
      maxResults: 1000,
      fields: 'summary,issuetype,project,timetracking,status,priority,duedate,assignee,parent,created,updated,reporter,worklog',
    },
  });

  const issues = r.data.issues ?? [];

  // Batch-fetch parent details
  const parentDataMap = new Map<string, ParentInfo>();

  if (parentKeys.length > 0) {
    try {
      const pJql = `key IN (${parentKeys.map(k => `"${k}"`).join(', ')})`;
      const pr = await api.get<{
        issues: Array<{
          key: string;
          fields: {
            summary: string;
            issuetype: { name: string; iconUrl: string };
            status: { name: string };
            duedate: string | null;
            timetracking?: { originalEstimateSeconds?: number };
          };
        }>;
      }>('/search', {
        params: {
          jql: pJql,
          maxResults: parentKeys.length + 10,
          fields: 'summary,issuetype,status,duedate,timetracking',
        },
      });
      for (const pi of pr.data.issues ?? []) {
        parentDataMap.set(pi.key, {
          key: pi.key,
          summary: pi.fields.summary,
          issueTypeName: pi.fields.issuetype?.name ?? '',
          issueTypeIconUrl: pi.fields.issuetype?.iconUrl ?? '',
          status: pi.fields.status?.name ?? '',
          duedate: pi.fields.duedate,
          estSeconds: pi.fields.timetracking?.originalEstimateSeconds ?? 0,
        });
      }
    } catch {
      // Non-critical
    }
  }

  return issues.map(issue => {
    const f = issue.fields;
    const est = f.timetracking?.originalEstimateSeconds ?? 0;
    const pk = f.parent?.key ?? null;
    const parentInfo = pk ? parentDataMap.get(pk) : undefined;

    // Sum logged seconds from worklog (all authors, as a rough indicator)
    const loggedSecs = f.worklog?.worklogs?.reduce((s, w) => s + (w.timeSpentSeconds ?? 0), 0) ?? 0;

    return {
      key: issue.key,
      issueId: issue.id,
      summary: f.summary,
      issueTypeName: f.issuetype?.name ?? 'Sub-task',
      issueTypeIconUrl: f.issuetype?.iconUrl ?? '',
      projectKey: f.project.key,
      projectName: f.project.name,
      status: f.status?.name ?? '',
      priority: f.priority?.name ?? 'Medium',
      assignee: f.assignee?.name ?? null,
      assigneeDisplayName: f.assignee?.displayName ?? null,
      assigneeAvatarUrl: f.assignee?.avatarUrls?.['24x24'] ?? null,
      reporter: f.reporter?.name ?? null,
      reporterDisplayName: f.reporter?.displayName ?? null,
      reporterAvatarUrl: f.reporter?.avatarUrls?.['24x24'] ?? null,
      originalEstimateSeconds: est,
      originalEstimateDisplay: formatDuration(est),
      loggedSeconds: loggedSecs,
      loggedDisplay: formatDuration(loggedSecs),
      duedate: f.duedate,
      created: f.created ?? null,
      updated: f.updated ?? null,
      parentKey: pk,
      parentSummary: parentInfo?.summary ?? f.parent?.fields?.summary ?? null,
      parentIssueTypeName: parentInfo?.issueTypeName ?? f.parent?.fields?.issuetype?.name ?? null,
      parentIssueTypeIconUrl: parentInfo?.issueTypeIconUrl ?? f.parent?.fields?.issuetype?.iconUrl ?? null,
      parentStatus: parentInfo?.status ?? f.parent?.fields?.status?.name ?? null,
      manualEstimateHours: null,
    };
  });
}

// ─── Update ────────────────────────────────────────────────────────────────

export interface EstimateUpdate {
  issueKey: string;
  estimateSeconds: number;
  duedate: string;
}

function secondsToJiraEstimate(seconds: number): string {
  if (seconds === 0) return '0h';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h >= 8 && h % 8 === 0 && m === 0) return `${h / 8}d`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export async function batchUpdateEstimate(
  updates: EstimateUpdate[],
  onProgress?: (done: number, total: number) => void,
): Promise<{ success: number; failed: number; errors: string[] }> {
  let success = 0;
  let failed = 0;
  const errors: string[] = [];

  // Process in chunks of 10 parallel
  const chunkSize = 10;
  for (let i = 0; i < updates.length; i += chunkSize) {
    const chunk = updates.slice(i, i + chunkSize);
    const results = await Promise.allSettled(
      chunk.map(u =>
        api.put(`/issue/${u.issueKey}`, {
          fields: {
            duedate: u.duedate,
            timetracking: {
              originalEstimate: secondsToJiraEstimate(u.estimateSeconds),
            },
          },
        }),
      ),
    );

    for (let j = 0; j < results.length; j++) {
      const result = results[j];
      if (result.status === 'fulfilled') {
        success++;
      } else {
        failed++;
        errors.push(`${chunk[j].issueKey}: ${String(result.reason)}`);
      }
    }

    onProgress?.(Math.min(i + chunkSize, updates.length), updates.length);
  }

  return { success, failed, errors };
}

// ─── Distribution Algorithm ────────────────────────────────────────────────
// Rules:
//   - 1 sub-task max 8h (28800 seconds)
//   - 1 day max 8h total (existing + new allocations)
//   - If day already has est from unchecked sub-tasks → remaining = 8h - existing
//   - Checked sub-tasks with existing estimate keep their size
//   - Checked sub-tasks without estimate get evenly divided remaining hours

const PRIORITY_ORDER: Record<string, number> = {
  'Highest': 5, 'High': 4, 'Medium': 3,
  'Low': 2, 'Lowest': 1, 'Blocker': 6, 'Minor': 1,
};

const MAX_PER_TASK = 8 * 3600;  // 8h
const MAX_PER_DAY = 8 * 3600;   // 8h
const SLOT = 1800;              // 0.5h unit

type TaskWithAssigned = WorkEstSubTask & { _assigned: number };

/** Round seconds to nearest 0.5h (1800s) slot */
function roundSlot(s: number): number {
  return Math.round(s / 1800) * 1800;
}

function sortSubTasks(tasks: TaskWithAssigned[]): TaskWithAssigned[] {
  return [...tasks].sort((a, b) => {
    const pa = PRIORITY_ORDER[a.priority] ?? 3;
    const pb = PRIORITY_ORDER[b.priority] ?? 3;
    if (pa !== pb) return pb - pa;
    if (a.duedate && b.duedate) return a.duedate.localeCompare(b.duedate);
    if (a.duedate) return -1;
    if (b.duedate) return 1;
    return a.key.localeCompare(b.key);
  });
}

export function distributeEstimates(
  subTasks: WorkEstSubTask[],
  fromDate: string,
  toDate: string,
  existingDayAllocations?: Record<string, number>,  // date → seconds pre-assigned
): WorkEstDistributeResult {
  // 1. Build working day list (always exclude weekends)
  const workingDays: string[] = [];
  const from = new Date(fromDate + 'T00:00:00');
  const to = new Date(toDate + 'T00:00:00');
  const cursor = new Date(from);

  while (cursor <= to) {
    const dayOfWeek = cursor.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    if (!isWeekend) {
      workingDays.push(localDateStr(cursor));
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  if (workingDays.length === 0) {
    return {
      schedule: [], workingDays: [],
      totalAvailableSeconds: 0, totalAllocatedSeconds: 0, totalExistingSeconds: 0,
    };
  }

  // 2. Daily remaining capacity = 8h - existing allocations from unchecked tasks
  const dayCapacity: Map<string, number> = new Map();
  let totalExisting = 0;
  for (const d of workingDays) {
    const existing = existingDayAllocations?.[d] ?? 0;
    dayCapacity.set(d, Math.max(0, MAX_PER_DAY - existing));
    totalExisting += existing;
  }
  const totalAvailable = workingDays.length * MAX_PER_DAY - totalExisting;

  // 3. Assign sizes — even split across ALL checked tasks, rounded to 0.5h
  const totalCapacity = workingDays.reduce((s, d) => s + (dayCapacity.get(d) ?? 0), 0);
  const taskCount = subTasks.length;
  const tasks: TaskWithAssigned[] = sortSubTasks(subTasks.map(t => ({ ...t, _assigned: 0 })));

  if (taskCount > 0 && totalCapacity > 0) {
    // Base: each task gets equal share (min 1h=2slots, max 8h=16slots)
    const totalSlots = Math.floor(totalCapacity / SLOT);
    let baseSlots = Math.min(Math.floor(totalSlots / taskCount), MAX_PER_TASK / SLOT);
    if (baseSlots < 2) baseSlots = 2; // enforce 1h min (2 slots)

    if (baseSlots * SLOT * taskCount > totalCapacity) {
      baseSlots = Math.floor(totalSlots / taskCount);
    }

    let used = 0;
    for (const t of tasks) {
      const alloc = baseSlots * SLOT;
      t._assigned = alloc;
      used += alloc;
    }

    // Distribute remainder in 0.5h chunks to first tasks
    let remainder = totalCapacity - used;
    for (const t of tasks) {
      if (remainder < SLOT) break;
      const add = Math.min(Math.floor(remainder / SLOT) * SLOT, MAX_PER_TASK - t._assigned);
      if (add >= SLOT) { t._assigned += add; remainder -= add; }
    }
  }

  // 4. Fill calendar — place all tasks into days
  const dayAllocs: Map<string, WorkEstAllocation[]> = new Map();
  const dayRemaining: Map<string, number> = new Map(dayCapacity);

  for (const d of workingDays) dayAllocs.set(d, []);

  let dayIdx = 0;

  for (const task of tasks) {
    let remainingSecs = task._assigned;

    while (remainingSecs > 0 && dayIdx < workingDays.length) {
      const day = workingDays[dayIdx];
      const avail = dayRemaining.get(day) ?? 0;
      if (avail <= 0) { dayIdx++; continue; }
      const alloc = Math.min(remainingSecs, avail);
      if (alloc > 0) {
        dayAllocs.get(day)!.push({
          issueKey: task.key,
          summary: task.summary,
          projectKey: task.projectKey,
          seconds: alloc,
          hours: Math.round((alloc / 3600) * 10) / 10,
          status: task.status,
          priority: task.priority,
          assigneeDisplayName: task.assigneeDisplayName,
          issueTypeName: task.issueTypeName,
          issueTypeIconUrl: task.issueTypeIconUrl,
        });
        dayRemaining.set(day, avail - alloc);
        remainingSecs -= alloc;
      }
      if ((dayRemaining.get(day) ?? 0) <= 0) dayIdx++;
    }
  }

  // 6. Build result
  const schedule: WorkEstDaySchedule[] = workingDays.map(date => {
    const allocs = dayAllocs.get(date) ?? [];
    const totalSeconds = allocs.reduce((s, a) => s + a.seconds, 0);
    const existing = existingDayAllocations?.[date] ?? 0;
    return {
      date,
      allocations: allocs,
      totalSeconds,
      totalHours: Math.round((totalSeconds / 3600) * 10) / 10,
      existingSeconds: existing,
      existingHours: Math.round((existing / 3600) * 10) / 10,
    };
  });

  const totalAllocated = schedule.reduce((s, d) => s + d.totalSeconds, 0);

  return {
    schedule,
    workingDays,
    totalAvailableSeconds: totalCapacity,
    totalAllocatedSeconds: totalAllocated,
    totalExistingSeconds: totalExisting,
  };
}
