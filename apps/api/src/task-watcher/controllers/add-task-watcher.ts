import { and, eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import db from "../../database";
import { taskTable, taskWatcherTable, userTable } from "../../database/schema";
import { publishEvent } from "../../events";
import {
  assertAssignableUser,
  getProjectWorkspaceId,
} from "../../utils/assert-assignable-user";

async function addTaskWatcher({
  taskId,
  userId,
  currentUserId,
}: {
  taskId: string;
  userId: string;
  currentUserId: string;
}) {
  const [task] = await db
    .select({ projectId: taskTable.projectId })
    .from(taskTable)
    .where(eq(taskTable.id, taskId))
    .limit(1);
  if (!task) {
    throw new HTTPException(404, { message: "Task not found" });
  }

  // A watcher must be able to see the task, same as an assignee.
  await assertAssignableUser(
    userId,
    await getProjectWorkspaceId(task.projectId),
    task.projectId,
  );

  const [inserted] = await db
    .insert(taskWatcherTable)
    .values({ taskId, userId })
    .onConflictDoNothing()
    .returning();

  const [watcher] = await db
    .select({
      taskId: taskWatcherTable.taskId,
      userId: taskWatcherTable.userId,
      name: userTable.name,
      image: userTable.image,
      createdAt: taskWatcherTable.createdAt,
    })
    .from(taskWatcherTable)
    .innerJoin(userTable, eq(userTable.id, taskWatcherTable.userId))
    .where(
      and(
        eq(taskWatcherTable.taskId, taskId),
        eq(taskWatcherTable.userId, userId),
      ),
    )
    .limit(1);

  if (!watcher) {
    throw new HTTPException(500, { message: "Failed to add task watcher" });
  }

  if (inserted) {
    await publishEvent("task.watchers_changed", {
      taskId,
      projectId: task.projectId,
      userId: currentUserId,
    });
  }

  return watcher;
}

export default addTaskWatcher;
