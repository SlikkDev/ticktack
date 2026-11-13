import { asc, eq } from "drizzle-orm";
import db from "../../database";
import { taskWatcherTable, userTable } from "../../database/schema";
import { canReceiveResourceNotification } from "../../notification/resource-access";

// Only list watchers who can still see the task, so people removed from the
// workspace or project disappear without a cleanup job. Watcher lists are
// short, so one access check per watcher is fine.
async function getTaskWatchers(taskId: string) {
  const watchers = await db
    .select({
      taskId: taskWatcherTable.taskId,
      userId: taskWatcherTable.userId,
      name: userTable.name,
      image: userTable.image,
      createdAt: taskWatcherTable.createdAt,
    })
    .from(taskWatcherTable)
    .innerJoin(userTable, eq(userTable.id, taskWatcherTable.userId))
    .where(eq(taskWatcherTable.taskId, taskId))
    .orderBy(asc(taskWatcherTable.createdAt), asc(taskWatcherTable.userId));

  const visible = await Promise.all(
    watchers.map((watcher) =>
      canReceiveResourceNotification(watcher.userId, taskId, "task"),
    ),
  );
  return watchers.filter((_, index) => visible[index]);
}

export default getTaskWatchers;
