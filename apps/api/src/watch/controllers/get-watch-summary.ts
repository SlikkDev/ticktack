import { and, asc, count, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import db from "../../database";
import {
  columnTable,
  notificationTable,
  projectTable,
  taskTable,
  timeEntryTable,
  userTable,
  workspaceTable,
  workspaceUserTable,
} from "../../database/schema";
import { notificationResourceAccess } from "../../notification/resource-access";
import { projectAccessCondition } from "../../project-access/project-access-condition";
import getAssignedTasks from "../../task/controllers/get-assigned-tasks";
import { hasInstanceAdminRole } from "../../utils/instance-admin-role";
import { roleHasWorkspacePermission } from "../../utils/require-workspace-permission";
import { mergeWatchTasks } from "../merge-watch-tasks";

// A watch shows a short list; the phone and web keep the full one.
export const WATCH_TASKS_LIMIT = 50;

// The same permissions the sidebar and My tasks need to show these tasks.
export const WATCH_PERMISSIONS = {
  workspace: ["read"],
  project: ["read"],
  task: ["read"],
};

async function readableWorkspaces(userId: string) {
  const memberships = await db
    .select({
      id: workspaceTable.id,
      name: workspaceTable.name,
      role: workspaceUserTable.role,
      instanceAdmin: userTable.role,
    })
    .from(workspaceUserTable)
    .innerJoin(
      workspaceTable,
      eq(workspaceTable.id, workspaceUserTable.workspaceId),
    )
    .innerJoin(userTable, eq(userTable.id, workspaceUserTable.userId))
    .where(eq(workspaceUserTable.userId, userId))
    .orderBy(sql`lower(${workspaceTable.name})`, workspaceTable.id);

  const readable = await Promise.all(
    memberships.map(async (membership) => {
      if (hasInstanceAdminRole(membership.instanceAdmin)) return true;
      return roleHasWorkspacePermission(
        membership.id,
        membership.role,
        WATCH_PERMISSIONS,
      );
    }),
  );

  return memberships
    .filter((_, index) => readable[index])
    .map(({ id, name }) => ({ id, name }));
}

async function loadProjects(
  projectIds: string[],
  workspaceNames: Map<string, string>,
) {
  if (projectIds.length === 0) return [];

  const [projects, columns] = await Promise.all([
    db
      .select({
        id: projectTable.id,
        name: projectTable.name,
        slug: projectTable.slug,
        workspaceId: projectTable.workspaceId,
      })
      .from(projectTable)
      .where(inArray(projectTable.id, projectIds))
      .orderBy(asc(projectTable.name), asc(projectTable.id)),
    db
      .select({
        projectId: columnTable.projectId,
        slug: columnTable.slug,
        name: columnTable.name,
        isFinal: columnTable.isFinal,
      })
      .from(columnTable)
      .where(inArray(columnTable.projectId, projectIds))
      .orderBy(
        asc(columnTable.position),
        asc(columnTable.createdAt),
        asc(columnTable.id),
      ),
  ]);

  return projects.map((project) => ({
    ...project,
    workspaceName: workspaceNames.get(project.workspaceId) ?? "",
    // Existing databases may hold duplicate slugs from concurrent column
    // creation; a status picker needs each slug once.
    statuses: columns
      .filter((column) => column.projectId === project.id)
      .filter(
        (column, index, all) =>
          all.findIndex((other) => other.slug === column.slug) === index,
      )
      .map(({ slug, name, isFinal }) => ({ slug, name, isFinal })),
  }));
}

async function loadRunningTimer(userId: string, workspaceIds: string[]) {
  if (workspaceIds.length === 0) return null;

  const [running] = await db
    .select({
      id: timeEntryTable.id,
      taskId: timeEntryTable.taskId,
      taskTitle: taskTable.title,
      projectName: projectTable.name,
      startTime: timeEntryTable.startTime,
    })
    .from(timeEntryTable)
    .innerJoin(taskTable, eq(taskTable.id, timeEntryTable.taskId))
    .innerJoin(projectTable, eq(projectTable.id, taskTable.projectId))
    .where(
      and(
        eq(timeEntryTable.userId, userId),
        isNull(timeEntryTable.endTime),
        inArray(projectTable.workspaceId, workspaceIds),
        projectAccessCondition(userId, projectTable.id),
      ),
    )
    .orderBy(desc(timeEntryTable.startTime), desc(timeEntryTable.id))
    .limit(1);

  return running ?? null;
}

async function countUnreadNotifications(userId: string) {
  const [row] = await db
    .select({ total: count() })
    .from(notificationTable)
    .where(
      and(
        eq(notificationTable.userId, userId),
        sql`coalesce(${notificationTable.isRead}, false) = false`,
        notificationResourceAccess(
          userId,
          notificationTable.resourceId,
          notificationTable.resourceType,
        ),
      ),
    );
  return Number(row?.total ?? 0);
}

/**
 * One compact payload for watch companions: what is on the caller's plate
 * across every workspace they can read, the running timer, and how many
 * notifications wait. Quick actions reuse the task status and time entry
 * routes, so their permission checks stay in one place.
 */
async function getWatchSummary(userId: string) {
  const [[user], workspaces] = await Promise.all([
    db
      .select({ id: userTable.id, name: userTable.name })
      .from(userTable)
      .where(eq(userTable.id, userId))
      .limit(1),
    readableWorkspaces(userId),
  ]);
  const workspaceIds = workspaces.map((workspace) => workspace.id);

  const [assigned, runningTimer, unreadNotifications] = await Promise.all([
    Promise.all(
      workspaceIds.map((workspaceId) =>
        getAssignedTasks(workspaceId, userId, { withLabels: false }),
      ),
    ),
    loadRunningTimer(userId, workspaceIds),
    countUnreadNotifications(userId),
  ]);

  const tasks = mergeWatchTasks(
    assigned.flatMap((page) => page.tasks),
    WATCH_TASKS_LIMIT,
  );
  const projects = await loadProjects(
    [...new Set(tasks.map((task) => task.projectId))],
    new Map(workspaces.map((workspace) => [workspace.id, workspace.name])),
  );

  return {
    user: { id: user?.id ?? userId, name: user?.name ?? "" },
    projects,
    tasks,
    total: assigned.reduce((sum, page) => sum + page.total, 0),
    runningTimer,
    unreadNotifications,
  };
}

export default getWatchSummary;
