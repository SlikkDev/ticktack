import { and, eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vite-plus/test";
import db, { schema } from "../../apps/api/src/database";
import { createApp } from "../../apps/api/src/index";
import { mockAuthenticatedSession } from "./helpers/auth";
import { resetTestDatabase } from "./helpers/database";
import {
  createProjectFixture,
  createWorkspaceMember,
} from "./helpers/fixtures";

async function addMember(workspaceId: string, role = "member") {
  const other = await createWorkspaceMember({ userName: `Member ${role}` });
  await db.insert(schema.workspaceUserTable).values({
    workspaceId,
    userId: other.user.id,
    role,
    joinedAt: new Date(),
  });
  return other.user;
}

async function seed() {
  const admin = await createWorkspaceMember({ role: "admin" });
  const workspaceId = admin.workspace.id;
  const reviewer = await addMember(workspaceId);
  const lead = await addMember(workspaceId);
  const fixture = await createProjectFixture({ workspaceId });
  const [task] = await db
    .insert(schema.taskTable)
    .values({
      projectId: fixture.project.id,
      title: "Ship it",
      status: "to-do",
      columnId: fixture.columns.todo.id,
      priority: "low",
      number: 1,
      userId: admin.user.id,
    })
    .returning();
  mockAuthenticatedSession(admin.user);
  const { app } = createApp();
  const send = (method: string, path: string, body?: unknown) =>
    app.request(`/api${path}`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  return { admin, workspaceId, reviewer, lead, fixture, task, send };
}

async function assigneeOf(taskId: string) {
  const [row] = await db
    .select({ userId: schema.taskTable.userId })
    .from(schema.taskTable)
    .where(eq(schema.taskTable.id, taskId));
  return row?.userId;
}

describe("API integration: status assign rules", () => {
  beforeEach(async () => {
    await resetTestDatabase();
  });

  it("assigns the workspace rule's user when a task moves into the status", async () => {
    const { workspaceId, reviewer, task, send } = await seed();

    const saved = await send(
      "PUT",
      `/status-assign-rule/workspace/${workspaceId}`,
      {
        status: "in-review",
        assigneeId: reviewer.id,
      },
    );
    expect(saved.status).toBe(200);

    const moved = await send("PUT", `/task/status/${task.id}`, {
      status: "in-review",
    });
    expect(moved.status).toBe(200);

    await vi.waitFor(async () => {
      expect(await assigneeOf(task.id)).toBe(reviewer.id);
    });
    await vi.waitFor(async () => {
      const notifications = await db
        .select()
        .from(schema.notificationTable)
        .where(
          and(
            eq(schema.notificationTable.userId, reviewer.id),
            eq(schema.notificationTable.type, "task_assignee_changed"),
          ),
        );
      expect(notifications).toHaveLength(1);
    });
  });

  it("lets a project rule override the workspace rule, and falls back once it is removed", async () => {
    const { workspaceId, reviewer, lead, fixture, task, send } = await seed();
    const projectId = fixture.project.id;

    await send("PUT", `/status-assign-rule/workspace/${workspaceId}`, {
      status: "in-review",
      assigneeId: reviewer.id,
    });
    const projectRule = await send(
      "PUT",
      `/status-assign-rule/project/${projectId}`,
      { status: "in-review", assigneeId: lead.id },
    );
    expect(projectRule.status).toBe(200);
    const { id: projectRuleId } = (await projectRule.json()) as { id: string };

    const listed = await send(
      "GET",
      `/status-assign-rule/project/${projectId}`,
    );
    const body = (await listed.json()) as {
      rules: Array<{ assigneeId: string }>;
      workspaceRules: Array<{ assigneeId: string }>;
    };
    expect(body.rules.map((rule) => rule.assigneeId)).toEqual([lead.id]);
    expect(body.workspaceRules.map((rule) => rule.assigneeId)).toEqual([
      reviewer.id,
    ]);

    await send("PUT", `/task/status/${task.id}`, { status: "in-review" });
    await vi.waitFor(async () => {
      expect(await assigneeOf(task.id)).toBe(lead.id);
    });

    const removed = await send(
      "DELETE",
      `/status-assign-rule/project/${projectId}/${projectRuleId}`,
    );
    expect(removed.status).toBe(200);

    await send("PUT", `/task/status/${task.id}`, { status: "to-do" });
    await send("PUT", `/task/status/${task.id}`, { status: "in-review" });
    await vi.waitFor(async () => {
      expect(await assigneeOf(task.id)).toBe(reviewer.id);
    });
  });

  it("rejects users outside the workspace and callers without permission", async () => {
    const { workspaceId, reviewer, fixture, send } = await seed();
    const outsider = await createWorkspaceMember();

    const foreign = await send(
      "PUT",
      `/status-assign-rule/project/${fixture.project.id}`,
      { status: "in-review", assigneeId: outsider.user.id },
    );
    expect(foreign.status).toBe(403);

    const unknownStatus = await send(
      "PUT",
      `/status-assign-rule/workspace/${workspaceId}`,
      { status: "nope", assigneeId: reviewer.id },
    );
    expect(unknownStatus.status).toBe(400);

    mockAuthenticatedSession(reviewer);
    const { app } = createApp();
    for (const path of [
      `/api/status-assign-rule/workspace/${workspaceId}`,
      `/api/status-assign-rule/project/${fixture.project.id}`,
    ]) {
      const denied = await app.request(path, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "in-review", assigneeId: reviewer.id }),
      });
      expect(denied.status).toBe(403);
    }
  });
});
