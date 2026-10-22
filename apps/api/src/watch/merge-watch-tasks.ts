export type WatchTaskInput = {
  id: string;
  projectId: string;
  number: number | null;
  title: string;
  status: string;
  statusName: string | null;
  priority: string;
  dueDate: Date | null;
};

const PRIORITY_RANK: Record<string, number> = {
  urgent: 4,
  high: 3,
  medium: 2,
  low: 1,
};

function compareWatchTasks(a: WatchTaskInput, b: WatchTaskInput) {
  if (a.dueDate && b.dueDate && a.dueDate.getTime() !== b.dueDate.getTime()) {
    return a.dueDate.getTime() - b.dueDate.getTime();
  }
  if (Boolean(a.dueDate) !== Boolean(b.dueDate)) {
    return a.dueDate ? -1 : 1;
  }
  return (PRIORITY_RANK[b.priority] ?? 0) - (PRIORITY_RANK[a.priority] ?? 0);
}

/**
 * Each workspace page arrives already ordered (due date, then priority); this
 * keeps that order across workspaces, which a watch cannot sort itself, and
 * trims the fields a wrist-sized list does not render.
 */
export function mergeWatchTasks<T extends WatchTaskInput>(
  tasks: readonly T[],
  limit: number,
): WatchTaskInput[] {
  return [...tasks]
    .sort(compareWatchTasks)
    .slice(0, limit)
    .map(
      ({
        id,
        projectId,
        number,
        title,
        status,
        statusName,
        priority,
        dueDate,
      }) => ({
        id,
        projectId,
        number,
        title,
        status,
        statusName,
        priority,
        dueDate,
      }),
    );
}
