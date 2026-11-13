import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vite-plus/test";
import db, { schema } from "../../apps/api/src/database";
import { createApp } from "../../apps/api/src/index";
import { mockAuthenticatedSession } from "./helpers/auth";
import { resetTestDatabase } from "./helpers/database";
import {
  createProjectFixture,
  createWorkspaceMember,
} from "./helpers/fixtures";

const m = vi.hoisted(() => ({ publish: vi.fn(async () => undefined) }));
vi.mock("../../apps/api/src/events", async (original) => ({
  ...(await original<object>()),
  publishEvent: m.publish,
}));

beforeEach(async () => {
  await resetTestDatabase();
  vi.clearAllMocks();
});

async function joinWorkspace(workspaceId: string, role: string) {
  const id = `user-${randomUUID()}`;
  const [user] = await db
    .insert(schema.userTable)
    .values({ id, email: `${id}@example.com`, emailVerified: true, name: id })
    .returning();
  await db
    .insert(schema.workspaceUserTable)
    .values({ workspaceId, userId: user.id, role, joinedAt: new Date() });
  return user;
}

async function context(role = "member") {
  const member = await createWorkspaceMember({ role });
  const { project } = await createProjectFixture({
    workspaceId: member.workspace.id,
  });
  const [task] = await db
    .insert(schema.taskTable)
    .values({ projectId: project.id, title: "Watched task", number: 1 })
    .returning();
  return { ...member, project, task };
}

function request(path: string, method: string) {
  return createApp().app.request(`/api/task-watcher${path}`, { method });
}

const watcherEvents = () =>
  m.publish.mock.calls.filter(
    (call) => (call as unknown[])[0] === "task.watchers_changed",
  );

describe("task watchers", () => {
  it("lets a member watch, list, and unwatch a task", async () => {
    const own = await context();
    mockAuthenticatedSession(own.user);

    const added = await request(`/${own.task.id}/${own.user.id}`, "PUT");
    expect(added.status).toBe(200);
    expect(await added.json()).toMatchObject({
      taskId: own.task.id,
      userId: own.user.id,
    });

    // Watching again is a no-op: one row, one event.
    expect(
      (await request(`/${own.task.id}/${own.user.id}`, "PUT")).status,
    ).toBe(200);
    expect(await db.query.taskWatcherTable.findMany()).toHaveLength(1);
    expect(watcherEvents()).toHaveLength(1);

    const list = await request(`/${own.task.id}`, "GET");
    expect(await list.json()).toEqual([
      expect.objectContaining({ userId: own.user.id }),
    ]);

    const removed = await request(`/${own.task.id}/${own.user.id}`, "DELETE");
    expect(removed.status).toBe(200);
    expect(await db.query.taskWatcherTable.findMany()).toHaveLength(0);
    expect(
      (await request(`/${own.task.id}/${own.user.id}`, "DELETE")).status,
    ).toBe(404);
  });

  it("needs task:assign to add someone else", async () => {
    const own = await context();
    const teammate = await joinWorkspace(own.workspace.id, "member");
    mockAuthenticatedSession(own.user);

    const denied = await request(`/${own.task.id}/${teammate.id}`, "PUT");
    expect(denied.status).toBe(403);
    expect(await db.query.taskWatcherTable.findMany()).toHaveLength(0);

    const admin = await joinWorkspace(own.workspace.id, "admin");
    mockAuthenticatedSession(admin);
    expect(
      (await request(`/${own.task.id}/${teammate.id}`, "PUT")).status,
    ).toBe(200);

    // A plain member cannot remove someone else's watch either.
    mockAuthenticatedSession(own.user);
    expect(
      (await request(`/${own.task.id}/${teammate.id}`, "DELETE")).status,
    ).toBe(403);
    expect(await db.query.taskWatcherTable.findMany()).toHaveLength(1);
  });

  it("rejects watchers from outside the workspace", async () => {
    const own = await context("admin");
    const foreign = await context();
    mockAuthenticatedSession(own.user);

    const response = await request(`/${own.task.id}/${foreign.user.id}`, "PUT");
    expect(response.status).toBe(403);
    expect(await db.query.taskWatcherTable.findMany()).toHaveLength(0);
  });

  it("hides another workspace's task and watchers", async () => {
    const own = await context();
    const foreign = await context();
    await db
      .insert(schema.taskWatcherTable)
      .values({ taskId: foreign.task.id, userId: foreign.user.id });
    mockAuthenticatedSession(own.user);

    expect((await request(`/${foreign.task.id}`, "GET")).status).not.toBe(200);
    expect(
      (await request(`/${foreign.task.id}/${own.user.id}`, "PUT")).status,
    ).not.toBe(200);
  });

  it("drops watchers who left the workspace from the list", async () => {
    const own = await context();
    const former = await joinWorkspace(own.workspace.id, "member");
    await db.insert(schema.taskWatcherTable).values([
      { taskId: own.task.id, userId: own.user.id },
      { taskId: own.task.id, userId: former.id },
    ]);
    await db
      .delete(schema.workspaceUserTable)
      .where(eq(schema.workspaceUserTable.userId, former.id));
    mockAuthenticatedSession(own.user);

    const list = await request(`/${own.task.id}`, "GET");
    expect(
      ((await list.json()) as { userId: string }[]).map((w) => w.userId),
    ).toEqual([own.user.id]);
  });
});
