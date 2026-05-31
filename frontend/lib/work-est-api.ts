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
  existingSeconds: number;
  existingHours: number;
  existingTasks: WorkEstSubTask[];  // old tasks grouped by day
  existingLogEntries: WorkEstLogEntry[];  // individual worklog entries
}

export interface WorkEstLogEntry {
  issueKey: string;
  summary: string;
  projectKey: string;
  seconds: number;
  hours: number;
  issueTypeName: string;
  issueTypeIconUrl: string;
  status: string;
  priority: string;
  assigneeDisplayName: string | null;
}

export interface WorkEstDistributeResult {
  schedule: WorkEstDaySchedule[];
  workingDays: string[];
  totalAvailableSeconds: number;
  totalAllocatedSeconds: number;
  totalExistingSeconds: number;
  errors?: string[];
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
      total: number;
      worklogs: Array<{ timeSpentSeconds: number; started: string; author: { name: string } }>;
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

/** Fetch sub-tasks by parent keys */
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

/** Fetch ANY sub-tasks that have duedate OR worklogs in the given date range.
 *  @param username - If provided, filters by this user's assigned tasks and worklogs.
 *                    If empty/undefined, uses `currentUser()` (default).
 */
export async function fetchTasksByDateRange(
  fromDate: string,
  toDate: string,
  username?: string,
): Promise<WorkEstSubTask[]> {
  // Build date boundary timestamps for worklog filtering
  const fromTs = new Date(fromDate + 'T00:00:00').getTime();
  const toTs = new Date(toDate + 'T23:59:59').getTime();

  // Query 1: sub-tasks assigned to the target user with duedate in range
  const userFilter = username ? `"${username}"` : 'currentUser()';
  const q1 = `issuetype = Sub-task AND assignee = ${userFilter} AND duedate >= "${fromDate}" AND duedate <= "${toDate}"`;
  // Query 2: tasks logged BY the target user in range (any issue type)
  const q2 = `worklogAuthor = ${userFilter} AND worklogDate >= "${fromDate}" AND worklogDate <= "${toDate}"`;

  const seen = new Set<string>();
  const results: WorkEstSubTask[] = [];

  const mapIssue = (issue: SubTaskRaw): (WorkEstSubTask & { worklogDays?: Record<string, number>; logEntries?: Record<string, WorkEstLogEntry[]> }) | null => {
    if (seen.has(issue.key)) return null;
    seen.add(issue.key);
    const f = issue.fields;
    const est = f.timetracking?.originalEstimateSeconds ?? 0;

    // Compute per-day worklog totals AND individual entries
    const worklogDays: Record<string, number> = {};
    const logEntries: Record<string, WorkEstLogEntry[]> = {};
    const allLogs = f.worklog?.worklogs ?? [];
    for (const wl of allLogs) {
      const t = new Date(wl.started).getTime();
      if (t >= fromTs && t <= toTs) {
        const dayKey = localDateStr(new Date(wl.started));
        worklogDays[dayKey] = (worklogDays[dayKey] ?? 0) + (wl.timeSpentSeconds ?? 0);
        if (!logEntries[dayKey]) logEntries[dayKey] = [];
        logEntries[dayKey].push({
          issueKey: issue.key,
          summary: f.summary,
          projectKey: f.project.key,
          seconds: wl.timeSpentSeconds ?? 0,
          hours: Math.round(((wl.timeSpentSeconds ?? 0) / 3600) * 10) / 10,
          issueTypeName: f.issuetype?.name ?? 'Sub-task',
          issueTypeIconUrl: f.issuetype?.iconUrl ?? '',
          status: f.status?.name ?? '',
          priority: f.priority?.name ?? 'Medium',
          assigneeDisplayName: f.assignee?.displayName ?? null,
        });
      }
    }
    const totalLogged = Object.values(worklogDays).reduce((s, v) => s + v, 0);

    return {
      key: issue.key, issueId: issue.id, summary: f.summary,
      issueTypeName: f.issuetype?.name ?? 'Sub-task',
      issueTypeIconUrl: f.issuetype?.iconUrl ?? '',
      projectKey: f.project.key, projectName: f.project.name,
      status: f.status?.name ?? '', priority: f.priority?.name ?? 'Medium',
      assignee: f.assignee?.name ?? null,
      assigneeDisplayName: f.assignee?.displayName ?? null,
      assigneeAvatarUrl: f.assignee?.avatarUrls?.['24x24'] ?? null,
      reporter: f.reporter?.name ?? null,
      reporterDisplayName: f.reporter?.displayName ?? null,
      reporterAvatarUrl: f.reporter?.avatarUrls?.['24x24'] ?? null,
      originalEstimateSeconds: est, originalEstimateDisplay: formatDuration(est),
      loggedSeconds: totalLogged, loggedDisplay: formatDuration(totalLogged),
      worklogDays, logEntries,
      duedate: f.duedate, created: f.created ?? null, updated: f.updated ?? null,
      parentKey: f.parent?.key ?? null,
      parentSummary: f.parent?.fields?.summary ?? null,
      parentIssueTypeName: f.parent?.fields?.issuetype?.name ?? null,
      parentIssueTypeIconUrl: f.parent?.fields?.issuetype?.iconUrl ?? null,
      parentStatus: f.parent?.fields?.status?.name ?? null,
      manualEstimateHours: null,
    } as any;
  };

  const fetchWithJql = async (jql: string) => {
    try {
      const r = await api.get<{ issues: SubTaskRaw[] }>('/search', {
        params: { jql, maxResults: 200, fields: 'summary,issuetype,project,timetracking,status,priority,duedate,assignee,parent,created,updated,reporter,worklog' },
      });
      for (const issue of r.data.issues ?? []) {
        const mapped = mapIssue(issue);
        if (mapped) results.push(mapped);
      }
    } catch { /* skip */ }
  };

  await Promise.all([fetchWithJql(q1), fetchWithJql(q2)]);

  return results;
}

// ─── Update ────────────────────────────────────────────────────────────────

export interface EstimateUpdate {
  issueKey: string;
  estimateSeconds: number;
  duedate: string;
  assignee?: string;
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
      chunk.map(u => {
        const fields: Record<string, unknown> = {
          duedate: u.duedate,
          timetracking: {
            originalEstimate: secondsToJiraEstimate(u.estimateSeconds),
          },
        };
        if (u.assignee) {
          fields.assignee = { name: u.assignee };
        }
        return api.put(`/issue/${u.issueKey}`, { fields });
      }),
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

/** Build a schedule from existing task data (worklogs + estimates) — for the "Load" phase.
 *  For each task:
 *    - If it has worklogs → show logged hours in `existingLogEntries`
 *    - If it has NO worklogs but HAS originalEstimate → show estimate as a planned allocation
 */
export function buildExistingSchedule(
  dateRangeTasks: WorkEstSubTask[],
  fromDate: string,
  toDate: string,
): WorkEstDistributeResult {
  // 1. Build working day list
  const workingDays: string[] = [];
  const from = new Date(fromDate + 'T00:00:00');
  const to = new Date(toDate + 'T00:00:00');
  const cursor = new Date(from);
  while (cursor <= to) {
    const dow = cursor.getDay();
    if (dow !== 0 && dow !== 6) workingDays.push(localDateStr(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  if (workingDays.length === 0) {
    return { schedule: [], workingDays: [], totalAvailableSeconds: 0, totalAllocatedSeconds: 0, totalExistingSeconds: 0 };
  }

  // 2. Classify tasks per day
  const logEntriesPerDay = new Map<string, WorkEstLogEntry[]>();
  const planAllocsPerDay = new Map<string, WorkEstAllocation[]>();
  let totalExistingSeconds = 0;

  for (const task of dateRangeTasks) {
    const logEntries = (task as any).logEntries as Record<string, WorkEstLogEntry[]> | undefined;
    const worklogDays = (task as any).worklogDays as Record<string, number> | undefined;

    // A. Has worklogs → show as log entries (existing)
    if (logEntries) {
      for (const [dayKey, entries] of Object.entries(logEntries)) {
        if (workingDays.includes(dayKey) && entries.length > 0) {
          if (!logEntriesPerDay.has(dayKey)) logEntriesPerDay.set(dayKey, []);
          for (const entry of entries) {
            logEntriesPerDay.get(dayKey)!.push(entry);
            totalExistingSeconds += entry.seconds;
          }
        }
      }
    }

    // B. Show estimate as "planned" allocation on duedate (when available)
    if (task.originalEstimateSeconds > 0) {
      let dayKey: string;
      // If task has worklogs, add estimate on each log day so cards show both est + log
      const logDays = logEntries
        ? Object.keys(logEntries).filter(d => workingDays.includes(d))
        : [];
      if (logDays.length > 0) {
        // Spread estimate proportionally across log days
        const totalSecs = task.originalEstimateSeconds;
        const perDaySecs = Math.floor(totalSecs / logDays.length / 1800) * 1800;
        const remainder = totalSecs - perDaySecs * logDays.length;
        for (let i = 0; i < logDays.length; i++) {
          const extra = i === logDays.length - 1 ? remainder : 0;
          const allocSecs = perDaySecs + extra;
          if (!planAllocsPerDay.has(logDays[i])) planAllocsPerDay.set(logDays[i], []);
          planAllocsPerDay.get(logDays[i])!.push({
            issueKey: task.key,
            summary: task.summary,
            projectKey: task.projectKey,
            seconds: allocSecs,
            hours: Math.round((allocSecs / 3600) * 10) / 10,
            status: task.status,
            priority: task.priority,
            assigneeDisplayName: task.assigneeDisplayName,
            issueTypeName: task.issueTypeName,
            issueTypeIconUrl: task.issueTypeIconUrl,
          });
        }
      } else {
        // No worklogs → use duedate or first working day
        if (task.duedate && workingDays.includes(task.duedate)) {
          dayKey = task.duedate;
        } else {
          dayKey = workingDays[0];
        }
        if (!planAllocsPerDay.has(dayKey)) planAllocsPerDay.set(dayKey, []);
        planAllocsPerDay.get(dayKey)!.push({
          issueKey: task.key,
          summary: task.summary,
          projectKey: task.projectKey,
          seconds: task.originalEstimateSeconds,
          hours: Math.round((task.originalEstimateSeconds / 3600) * 10) / 10,
          status: task.status,
          priority: task.priority,
          assigneeDisplayName: task.assigneeDisplayName,
          issueTypeName: task.issueTypeName,
          issueTypeIconUrl: task.issueTypeIconUrl,
        });
      }
    }
  }

  // 3. Build schedule
  const schedule: WorkEstDaySchedule[] = workingDays.map(date => {
    const dayLogs = logEntriesPerDay.get(date) ?? [];
    const dayPlans = planAllocsPerDay.get(date) ?? [];
    const planSecs = dayPlans.reduce((s, a) => s + a.seconds, 0);
    const logSecs = dayLogs.reduce((s, e) => s + e.seconds, 0);
    return {
      date,
      allocations: dayPlans,
      totalSeconds: planSecs,
      totalHours: Math.round((planSecs / 3600) * 10) / 10,
      existingSeconds: logSecs,
      existingHours: Math.round((logSecs / 3600) * 10) / 10,
      existingTasks: [],
      existingLogEntries: dayLogs,
    };
  });

  return {
    schedule,
    workingDays,
    totalAvailableSeconds: workingDays.length * 8 * 3600,
    totalAllocatedSeconds: schedule.reduce((s, d) => s + d.totalSeconds, 0),
    totalExistingSeconds,
  };
}

export function distributeEstimates(
  subTasks: WorkEstSubTask[],
  fromDate: string,
  toDate: string,
  existingDayAllocations?: Record<string, number>,
  uncheckedTasks?: WorkEstSubTask[],
): WorkEstDistributeResult {
  const errors: string[] = [];

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
      errors,
    };
  }

  const totalEstimateSeconds = workingDays.length * MAX_PER_DAY;

  // 2. Filter selected tasks — LOCKED vs ACTIVE
  const activeTasks: WorkEstSubTask[] = [];

  for (const t of subTasks) {
    if (t.loggedSeconds < MAX_PER_TASK) {
      activeTasks.push(t);
    }
  }

  // 3. Even split
  let secsPerTask = 0;
  if (activeTasks.length > 0) {
    secsPerTask = Math.floor(totalEstimateSeconds / activeTasks.length / SLOT) * SLOT;
  }

  // 4. Validate
  if (activeTasks.length === 0) {
    errors.push('Tất cả sub-task đã chọn đều đã log >= 8h. Không có task nào để phân rã.');
  }
  if (secsPerTask > MAX_PER_TASK) {
    const N = Math.ceil(totalEstimateSeconds / MAX_PER_TASK);
    errors.push(`Không đủ sub-task. Cần ít nhất ${N} sub-task để lấp đủ ${workingDays.length} ngày (${totalEstimateSeconds / 3600}h).`);
  }

  // 5. Assign sizes
  const tasks: TaskWithAssigned[] = sortSubTasks(subTasks.map(t => {
    const isActive = t.loggedSeconds < MAX_PER_TASK;
    let assigned: number;
    if (isActive && activeTasks.length > 0) {
      assigned = Math.min(secsPerTask, MAX_PER_TASK);
    } else {
      assigned = 0;
    }
    return { ...t, _assigned: assigned };
  }));

  // 6. Greedy fill — place tasks into days, max 8h per day
  //    dayRemaining starts at MAX_PER_DAY (existing logs displayed separately)
  const existingPerDay: Map<string, WorkEstSubTask[]> = new Map();
  const logEntriesPerDay: Map<string, WorkEstLogEntry[]> = new Map();

  // Collect existing log entries from uncheckedTasks
  if (uncheckedTasks) {
    for (const ut of uncheckedTasks) {
      if (!(ut.loggedSeconds > 0)) continue;

      const le = (ut as any).logEntries as Record<string, WorkEstLogEntry[]> | undefined;
      if (le) {
        for (const [dayKey, entries] of Object.entries(le)) {
          if (workingDays.includes(dayKey) && entries.length > 0) {
            if (!logEntriesPerDay.has(dayKey)) logEntriesPerDay.set(dayKey, []);
            for (const entry of entries) logEntriesPerDay.get(dayKey)!.push(entry);
          }
        }
      }

      const wd = (ut as any).worklogDays as Record<string, number> | undefined;
      let daysWithLogs: string[] = [];
      if (wd) {
        daysWithLogs = Object.entries(wd)
          .filter(([, secs]) => secs > 0)
          .map(([day]) => day)
          .filter(day => workingDays.includes(day));
      }
      if (daysWithLogs.length > 0) {
        for (const dayKey of daysWithLogs) {
          if (!existingPerDay.has(dayKey)) existingPerDay.set(dayKey, []);
          existingPerDay.get(dayKey)!.push(ut);
        }
      }
    }
  }

  const dayAllocs: Map<string, WorkEstAllocation[]> = new Map();
  const dayRemaining: Map<string, number> = new Map();

  for (const d of workingDays) {
    dayRemaining.set(d, MAX_PER_DAY);
    dayAllocs.set(d, []);
  }

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

  // 7. Build schedule
  const schedule: WorkEstDaySchedule[] = workingDays.map(date => {
    const allocs = dayAllocs.get(date) ?? [];
    const totalSeconds = allocs.reduce((s, a) => s + a.seconds, 0);
    const dayExisting = existingPerDay.get(date) ?? [];
    const dayLogs = logEntriesPerDay.get(date) ?? [];
    const existingSecs = dayLogs.reduce((s, e) => s + e.seconds, 0);
    return {
      date,
      allocations: allocs,
      totalSeconds,
      totalHours: Math.round((totalSeconds / 3600) * 10) / 10,
      existingSeconds: existingSecs,
      existingHours: Math.round((existingSecs / 3600) * 10) / 10,
      existingTasks: dayExisting,
      existingLogEntries: dayLogs,
    };
  });

  const totalAllocated = schedule.reduce((s, d) => s + d.totalSeconds, 0);
  const totalExistingSecs = schedule.reduce((s, d) => s + d.existingSeconds, 0);

  return {
    schedule,
    workingDays,
    totalAvailableSeconds: totalEstimateSeconds,
    totalAllocatedSeconds: totalAllocated,
    totalExistingSeconds: totalExistingSecs,
    errors: errors.length > 0 ? errors : undefined,
  };
}

