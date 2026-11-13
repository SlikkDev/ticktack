import { eq } from "drizzle-orm";
import db from "../database";
import {
  projectTable,
  taskTable,
  taskWatcherTable,
  userTable,
} from "../database/schema";
import { subscribeToEvent } from "../events";
import createNotification from "../notification/controllers/create-notification";
import { parseMentionIds } from "../utils/parse-mentions";
import { watcherRecipients } from "./watcher-recipients";

// Watcher notifications live beside the existing assignee and mention
// notifications rather than inside them. Each handler skips the people those
// already reach, so nobody hears about one change twice.

async function watchedTask(taskId: string) {
  const watchers = await db
    .select({ userId: taskWatcherTable.userId })
    .from(taskWatcherTable)
    .where(eq(taskWatcherTable.taskId, taskId));
  if (watchers.length === 0) return null;

  const [task] = await db
    .select({
      title: taskTable.title,
      assigneeId: taskTable.userId,
      projectId: taskTable.projectId,
      workspaceId: projectTable.workspaceId,
    })
    .from(taskTable)
    .innerJoin(projectTable, eq(taskTable.projectId, projectTable.id))
    .where(eq(taskTable.id, taskId))
    .limit(1);
  if (!task) return null;

  return { ...task, watcherIds: watchers.map((row) => row.userId) };
}

type WatchedTask = NonNullable<Awaited<ReturnType<typeof watchedTask>>>;

async function notifyWatchers(
  taskId: string,
  notification: {
    type: string;
    eventData: Record<string, unknown>;
    excluded: (task: WatchedTask) => Array<string | null | undefined>;
  },
) {
  const task = await watchedTask(taskId);
  if (!task) return;

  const { type, eventData } = notification;
  const recipients = watcherRecipients(
    task.watcherIds,
    notification.excluded(task),
  );
  for (const userId of recipients) {
    await createNotification({
      userId,
      type,
      eventData: {
        ...eventData,
        taskTitle: task.title,
        projectId: task.projectId,
        workspaceId: task.workspaceId,
      },
      resourceId: taskId,
      resourceType: "task",
    });
  }
}

subscribeToEvent<{
  taskId: string;
  userId?: string;
  oldStatus: string;
  newStatus: string;
  assigneeId?: string | null;
}>("task.status_changed", async (data) => {
  // The assignee already gets its own status notification.
  await notifyWatchers(data.taskId, {
    type: "task_status_changed",
    eventData: { oldStatus: data.oldStatus, newStatus: data.newStatus },
    excluded: () => [data.userId, data.assigneeId],
  });
});

for (const eventName of ["task.assignee_changed", "task.unassigned"]) {
  subscribeToEvent<{
    taskId: string;
    userId?: string;
    newAssignee?: string | null;
    newAssigneeId?: string | null;
  }>(eventName, async (data) => {
    // The new assignee already gets "assigned to you".
    await notifyWatchers(data.taskId, {
      type: "watched_task_assignee_changed",
      eventData: {
        assigneeName: data.newAssigneeId ? (data.newAssignee ?? null) : null,
      },
      excluded: () => [data.userId, data.newAssigneeId],
    });
  });
}

subscribeToEvent<{
  taskId: string;
  userId?: string | null;
  content?: string | null;
  externalUserName?: string | null;
}>("comment.created", async (data) => {
  const [author] = data.userId
    ? await db
        .select({ name: userTable.name })
        .from(userTable)
        .where(eq(userTable.id, data.userId))
        .limit(1)
    : [];

  // Mentioned users and the assignee already get a comment notification.
  await notifyWatchers(data.taskId, {
    type: "watched_task_comment",
    eventData: {
      commenterName: data.externalUserName ?? author?.name ?? null,
      commentPreview: (data.content ?? "").slice(0, 160),
    },
    excluded: (task) => [
      data.userId,
      task.assigneeId,
      ...parseMentionIds(data.content),
    ],
  });
});
