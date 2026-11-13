import { and, eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import db from "../../database";
import { taskTable, taskWatcherTable } from "../../database/schema";
import { publishEvent } from "../../events";

async function removeTaskWatcher({
  taskId,
  userId,
  currentUserId,
}: {
  taskId: string;
  userId: string;
  currentUserId: string;
}) {
  const [removed] = await db
    .delete(taskWatcherTable)
    .where(
      and(
        eq(taskWatcherTable.taskId, taskId),
        eq(taskWatcherTable.userId, userId),
      ),
    )
    .returning();

  if (!removed) {
    throw new HTTPException(404, { message: "User is not watching this task" });
  }

  const [task] = await db
    .select({ projectId: taskTable.projectId })
    .from(taskTable)
    .where(eq(taskTable.id, taskId))
    .limit(1);

  if (task) {
    await publishEvent("task.watchers_changed", {
      taskId,
      projectId: task.projectId,
      userId: currentUserId,
    });
  }

  return { taskId: removed.taskId, userId: removed.userId };
}

export default removeTaskWatcher;
