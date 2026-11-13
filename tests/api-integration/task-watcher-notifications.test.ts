import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it } from "vite-plus/test";
import db, { schema } from "../../apps/api/src/database";
import { publishEvent } from "../../apps/api/src/events";
import "../../apps/api/src/task-watcher/notify-watchers";
import { resetTestDatabase } from "./helpers/database";
import {
  createProjectFixture,
  createWorkspaceMember,
} from "./helpers/fixtures";

beforeEach(async () => {
  await resetTestDatabase();
});

async function joinWorkspace(workspaceId: string) {
  const id = `user-${randomUUID()}`;
  const [user] = await db
    .insert(schema.userTable)
    .values({ id, email: `${id}@example.com`, emailVerified: true, name: id })
    .returning();
  await db.insert(schema.workspaceUserTable).values({
    workspaceId,
    userId: user.id,
    role: "member",
    joinedAt: new Date(),
  });
  return user;
}

async function watchedTask() {
  const { user: author, workspace } = await createWorkspaceMember({
    userName: "Author",
  });
  const { project } = await createProjectFixture({ workspaceId: workspace.id });
  const assignee = await joinWorkspace(workspace.id);
  const watcher = await joinWorkspace(workspace.id);
  const [task] = await db
    .insert(schema.taskTable)
    .values({
      projectId: project.id,
      title: "Watched task",
      number: 1,
      userId: assignee.id,
    })
    .returning();
  await db.insert(schema.taskWatcherTable).values(
    [author, assignee, watcher].map((user) => ({
      taskId: task.id,
      userId: user.id,
    })),
  );
  return { author, assignee, watcher, task };
}

async function notifications() {
  return db
    .select({
      userId: schema.notificationTable.userId,
      type: schema.notificationTable.type,
      eventData: schema.notificationTable.eventData,
    })
    .from(schema.notificationTable);
}

describe("task watcher notifications", () => {
  it("tells watchers about a comment, skipping the author and the assignee", async () => {
    const { author, watcher, task } = await watchedTask();

    await publishEvent(
      "comment.created",
      { taskId: task.id, userId: author.id, content: "Looks good" },
      { waitForHandlers: true },
    );

    const rows = (await notifications()).filter(
      (row) => row.type === "watched_task_comment",
    );
    expect(rows).toEqual([
      expect.objectContaining({
        userId: watcher.id,
        eventData: expect.objectContaining({
          taskTitle: "Watched task",
          commenterName: "Author",
          commentPreview: "Looks good",
        }),
      }),
    ]);
  });

  it("skips watchers who were @mentioned in the comment", async () => {
    const { author, watcher, task } = await watchedTask();

    await publishEvent(
      "comment.created",
      {
        taskId: task.id,
        userId: author.id,
        content: `<kaneo-mention id="${watcher.id}"></kaneo-mention> hi`,
      },
      { waitForHandlers: true },
    );

    expect(
      (await notifications()).filter(
        (row) => row.type === "watched_task_comment",
      ),
    ).toEqual([]);
  });

  it("tells watchers about status and assignee changes", async () => {
    const { author, assignee, watcher, task } = await watchedTask();

    await publishEvent(
      "task.status_changed",
      {
        taskId: task.id,
        userId: author.id,
        oldStatus: "to-do",
        newStatus: "done",
        assigneeId: assignee.id,
      },
      { waitForHandlers: true },
    );
    await publishEvent(
      "task.unassigned",
      { taskId: task.id, userId: author.id, newAssigneeId: null },
      { waitForHandlers: true },
    );

    const watcherRows = (await notifications()).filter(
      (row) => row.userId === watcher.id,
    );
    expect(watcherRows.map((row) => row.type).sort()).toEqual([
      "task_status_changed",
      "watched_task_assignee_changed",
    ]);
    // The author made both changes and hears about neither from watching.
    expect(
      (await notifications()).filter((row) => row.userId === author.id),
    ).toEqual([]);
  });
});
