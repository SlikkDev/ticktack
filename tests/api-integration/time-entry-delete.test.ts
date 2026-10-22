import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vite-plus/test";
import db, { schema } from "../../apps/api/src/database";
import { createApp } from "../../apps/api/src/index";
import { mockAuthenticatedSession } from "./helpers/auth";
import { resetTestDatabase } from "./helpers/database";
import {
  createProjectFixture,
  createWorkspaceMember,
} from "./helpers/fixtures";

async function seedTimeEntryFor(workspaceId: string, userId: string) {
  const { project, columns } = await createProjectFixture({ workspaceId });
  const [task] = await db
    .insert(schema.taskTable)
    .values({
      projectId: project.id,
      title: "Tracked task",
      description: "",
      priority: "low",
      status: "to-do",
      columnId: columns.todo?.id ?? null,
      number: 1,
      position: 1,
    })
    .returning();
  const [entry] = await db
    .insert(schema.timeEntryTable)
    .values({
      taskId: task.id,
      userId,
      description: "",
      startTime: new Date("2026-01-01T09:00:00.000Z"),
      endTime: new Date("2026-01-01T10:00:00.000Z"),
      duration: 3600,
    })
    .returning();
  return entry;
}

async function findEntry(id: string) {
  return db.query.timeEntryTable.findFirst({
    where: eq(schema.timeEntryTable.id, id),
  });
}

beforeEach(async () => {
  await resetTestDatabase();
});

describe("DELETE /api/time-entry/:id", () => {
  it("removes the entry and returns it", async () => {
    const { user, workspace } = await createWorkspaceMember({ role: "owner" });
    const entry = await seedTimeEntryFor(workspace.id, user.id);

    mockAuthenticatedSession(user);
    const { app } = createApp();

    const response = await app.request(`/api/time-entry/${entry.id}`, {
      method: "DELETE",
    });

    expect(response.status).toBe(200);
    expect((await response.json()).id).toBe(entry.id);
    expect(await findEntry(entry.id)).toBeUndefined();
  });

  it("returns 404 for an unknown entry", async () => {
    const { user } = await createWorkspaceMember({ role: "owner" });

    mockAuthenticatedSession(user);
    const { app } = createApp();

    const response = await app.request("/api/time-entry/missing", {
      method: "DELETE",
    });

    expect(response.status).toBe(404);
  });

  it("blocks a viewer, who lacks task:update", async () => {
    const owner = await createWorkspaceMember({ role: "owner" });
    const entry = await seedTimeEntryFor(owner.workspace.id, owner.user.id);
    const viewer = await createWorkspaceMember({ role: "viewer" });
    await db.insert(schema.workspaceUserTable).values({
      workspaceId: owner.workspace.id,
      userId: viewer.user.id,
      role: "viewer",
      joinedAt: new Date(),
    });

    mockAuthenticatedSession(viewer.user);
    const { app } = createApp();

    const response = await app.request(`/api/time-entry/${entry.id}`, {
      method: "DELETE",
    });

    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({
      code: "MISSING_PERMISSION",
      missingPermissions: ["task:update"],
    });
    expect(await findEntry(entry.id)).toBeDefined();
  });

  it("does not let a member of another workspace delete the entry", async () => {
    const owner = await createWorkspaceMember({ role: "owner" });
    const entry = await seedTimeEntryFor(owner.workspace.id, owner.user.id);
    const outsider = await createWorkspaceMember({ role: "owner" });

    mockAuthenticatedSession(outsider.user);
    const { app } = createApp();

    const response = await app.request(`/api/time-entry/${entry.id}`, {
      method: "DELETE",
    });

    expect([403, 404]).toContain(response.status);
    expect(await findEntry(entry.id)).toBeDefined();
  });
});
