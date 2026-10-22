import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vite-plus/test";
import { auth } from "../../apps/api/src/auth";
import db, { schema } from "../../apps/api/src/database";
import { createApp } from "../../apps/api/src/index";
import { mockAnonymousSession, mockAuthenticatedSession } from "./helpers/auth";
import { resetTestDatabase } from "./helpers/database";
import {
  createProjectFixture,
  createWorkspaceMember,
} from "./helpers/fixtures";

type WatchSummary = {
  user: { id: string; name: string };
  projects: Array<{
    id: string;
    name: string;
    slug: string;
    workspaceId: string;
    workspaceName: string;
    statuses: Array<{ slug: string; name: string; isFinal: boolean }>;
  }>;
  tasks: Array<{
    id: string;
    projectId: string;
    title: string;
    status: string;
    statusName: string | null;
    priority: string;
    dueDate: string | null;
  }>;
  total: number;
  runningTimer: {
    id: string;
    taskId: string;
    taskTitle: string;
    projectName: string;
    startTime: string;
  } | null;
  unreadNotifications: number;
};

async function joinWorkspace(
  workspaceId: string,
  userId: string,
  role = "member",
) {
  await db.insert(schema.workspaceUserTable).values({
    workspaceId,
    userId,
    role,
    joinedAt: new Date(),
  });
}

describe("API integration: watch summary", () => {
  beforeEach(async () => {
    await resetTestDatabase();
  });

  it("summarizes open assigned tasks, project statuses, the running timer and unread notifications across readable workspaces", async () => {
    const member = await createWorkspaceMember({
      userName: "Watch Wearer",
      workspaceName: "Beta",
    });
    const second = await createWorkspaceMember({ workspaceName: "Alpha" });
    await joinWorkspace(second.workspace.id, member.user.id);

    // A workspace whose role cannot read tasks must not leak into the summary.
    const hidden = await createWorkspaceMember({ workspaceName: "Hidden" });
    await db.insert(schema.workspaceRoleTable).values({
      workspaceId: hidden.workspace.id,
      role: "limited",
      permission: JSON.stringify({ workspace: ["read"], project: ["read"] }),
    });
    await joinWorkspace(hidden.workspace.id, member.user.id, "limited");

    const web = await createProjectFixture({
      workspaceId: member.workspace.id,
      name: "Web",
      slug: "web",
    });
    const api = await createProjectFixture({
      workspaceId: second.workspace.id,
      name: "API",
      slug: "api",
    });
    const secret = await createProjectFixture({
      workspaceId: hidden.workspace.id,
      slug: "secret",
    });
    const archived = await createProjectFixture({
      workspaceId: member.workspace.id,
      slug: "old",
    });
    await db
      .update(schema.projectTable)
      .set({ archivedAt: new Date() })
      .where(eq(schema.projectTable.id, archived.project.id));

    const base = { position: 1 };
    const [later, soon, undatedHigh, undatedLow] = await db
      .insert(schema.taskTable)
      .values([
        {
          ...base,
          projectId: web.project.id,
          title: "Due later",
          priority: "urgent",
          status: "to-do",
          columnId: web.columns.todo.id,
          userId: member.user.id,
          number: 1,
          dueDate: new Date("2030-02-01T00:00:00.000Z"),
        },
        {
          ...base,
          projectId: api.project.id,
          title: "Due soon",
          priority: "low",
          status: "in-progress",
          columnId: api.columns.inProgress.id,
          userId: member.user.id,
          number: 1,
          dueDate: new Date("2030-01-01T00:00:00.000Z"),
        },
        {
          ...base,
          projectId: web.project.id,
          title: "No due date, high",
          priority: "high",
          status: "to-do",
          columnId: web.columns.todo.id,
          userId: member.user.id,
          number: 2,
        },
        {
          ...base,
          projectId: api.project.id,
          title: "No due date, low",
          priority: "low",
          status: "to-do",
          columnId: api.columns.todo.id,
          userId: member.user.id,
          number: 2,
        },
        {
          ...base,
          projectId: web.project.id,
          title: "Already done",
          priority: "medium",
          status: "done",
          columnId: web.columns.done.id,
          userId: member.user.id,
          number: 3,
        },
        {
          ...base,
          projectId: web.project.id,
          title: "Someone else's",
          priority: "medium",
          status: "to-do",
          columnId: web.columns.todo.id,
          userId: second.user.id,
          number: 4,
        },
        {
          ...base,
          projectId: archived.project.id,
          title: "In an archived project",
          priority: "medium",
          status: "to-do",
          columnId: archived.columns.todo.id,
          userId: member.user.id,
          number: 1,
        },
        {
          ...base,
          projectId: secret.project.id,
          title: "In a workspace without task access",
          priority: "medium",
          status: "to-do",
          columnId: secret.columns.todo.id,
          userId: member.user.id,
          number: 1,
        },
      ])
      .returning();

    const [, running] = await db
      .insert(schema.timeEntryTable)
      .values([
        {
          taskId: later.id,
          userId: member.user.id,
          startTime: new Date("2026-01-01T08:00:00.000Z"),
          endTime: new Date("2026-01-01T09:00:00.000Z"),
          duration: 3600,
        },
        {
          taskId: soon.id,
          userId: member.user.id,
          startTime: new Date("2026-01-02T08:00:00.000Z"),
        },
        {
          taskId: soon.id,
          userId: second.user.id,
          startTime: new Date("2026-01-03T08:00:00.000Z"),
        },
      ])
      .returning();

    await db.insert(schema.notificationTable).values([
      { userId: member.user.id, type: "info", title: "Unread one" },
      {
        userId: member.user.id,
        type: "task_comment",
        resourceId: soon.id,
        resourceType: "task",
      },
      {
        userId: member.user.id,
        type: "info",
        title: "Already read",
        isRead: true,
      },
      {
        userId: member.user.id,
        type: "task_comment",
        resourceId: secret.project.id,
        resourceType: "task",
      },
      { userId: second.user.id, type: "info", title: "Not mine" },
    ]);

    mockAuthenticatedSession(member.user);
    const { app } = createApp();

    const response = await app.request("/api/watch/summary");
    expect(response.status).toBe(200);
    const body = (await response.json()) as WatchSummary;

    expect(body.user).toEqual({ id: member.user.id, name: "Watch Wearer" });
    expect(body.total).toBe(4);
    expect(body.tasks.map((task) => task.title)).toEqual([
      "Due soon",
      "Due later",
      "No due date, high",
      "No due date, low",
    ]);
    expect(body.tasks[0]).toMatchObject({
      id: soon.id,
      projectId: api.project.id,
      status: "in-progress",
      statusName: "In Progress",
      priority: "low",
      dueDate: "2030-01-01T00:00:00.000Z",
    });
    expect(body.tasks[2]).toMatchObject({ id: undatedHigh.id, dueDate: null });
    expect(body.tasks[3]).toMatchObject({ id: undatedLow.id });
    expect(body.tasks[0]).not.toHaveProperty("labels");

    expect(body.projects.map((project) => project.slug)).toEqual([
      "api",
      "web",
    ]);
    expect(body.projects[0]).toMatchObject({
      id: api.project.id,
      name: "API",
      workspaceId: second.workspace.id,
      workspaceName: "Alpha",
      statuses: [
        { slug: "to-do", name: "To Do", isFinal: false },
        { slug: "in-progress", name: "In Progress", isFinal: false },
        { slug: "in-review", name: "In Review", isFinal: false },
        { slug: "done", name: "Done", isFinal: true },
      ],
    });
    expect(body.projects[1]).toMatchObject({
      id: web.project.id,
      workspaceName: "Beta",
    });

    expect(body.runningTimer).toEqual({
      id: running.id,
      taskId: soon.id,
      taskTitle: "Due soon",
      projectName: "API",
      startTime: "2026-01-02T08:00:00.000Z",
    });
    expect(body.unreadNotifications).toBe(2);
  });

  it("returns an empty summary for a user without workspaces", async () => {
    const [user] = await db
      .insert(schema.userTable)
      .values({
        id: "lonely-user",
        email: "lonely@example.com",
        emailVerified: true,
        name: "Lonely",
      })
      .returning();

    mockAuthenticatedSession(user);
    const { app } = createApp();

    const response = await app.request("/api/watch/summary");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      user: { id: user.id, name: "Lonely" },
      projects: [],
      tasks: [],
      total: 0,
      runningTimer: null,
      unreadNotifications: 0,
    });
  });

  it("lists each duplicated column slug once", async () => {
    const member = await createWorkspaceMember();
    const { project, columns } = await createProjectFixture({
      workspaceId: member.workspace.id,
    });
    await db.insert(schema.columnTable).values({
      projectId: project.id,
      name: "Duplicate to-do",
      slug: columns.todo.slug,
      position: 10,
      isFinal: false,
    });
    await db.insert(schema.taskTable).values({
      projectId: project.id,
      title: "Open",
      status: columns.todo.slug,
      columnId: columns.todo.id,
      userId: member.user.id,
      number: 1,
    });

    mockAuthenticatedSession(member.user);
    const { app } = createApp();
    const body = (await (
      await app.request("/api/watch/summary")
    ).json()) as WatchSummary;

    expect(body.projects).toHaveLength(1);
    expect(body.projects[0]?.statuses.map((status) => status.slug)).toEqual([
      "to-do",
      "in-progress",
      "in-review",
      "done",
    ]);
  });

  it("honours API key scopes and requires a session", async () => {
    const member = await createWorkspaceMember();
    const { key: scoped } = await auth.api.createApiKey({
      body: {
        userId: member.user.id,
        name: "Watch test",
        permissions: { workspace: ["read"], project: ["read"] },
      },
    });
    const { key: full } = await auth.api.createApiKey({
      body: { userId: member.user.id, name: "Watch test full" },
    });

    mockAnonymousSession();
    const { app } = createApp();

    const anonymous = await app.request("/api/watch/summary");
    expect(anonymous.status).toBe(401);

    const forbidden = await app.request("/api/watch/summary", {
      headers: { "x-api-key": scoped },
    });
    expect(forbidden.status).toBe(403);

    const allowed = await app.request("/api/watch/summary", {
      headers: { "x-api-key": full },
    });
    expect(allowed.status).toBe(200);
    expect(((await allowed.json()) as WatchSummary).user.id).toBe(
      member.user.id,
    );
  });
});
