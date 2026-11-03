import { eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { projectTable, taskTable } from "../../database/schema";
import { assertVersionInWorkspace } from "../../version/assert-version-in-workspace";
import { publishTaskMutation } from "./task-mutation-effects";
import { withLockedTask } from "./with-locked-task";

async function updateTaskVersion({
  id,
  versionId,
  currentUserId,
}: {
  id: string;
  versionId: string | null;
  currentUserId: string;
}) {
  const { before: existingTask, after: updatedTask } = await withLockedTask(
    id,
    async (tx, task) => {
      if (versionId) {
        const [project] = await tx
          .select({ workspaceId: projectTable.workspaceId })
          .from(projectTable)
          .where(eq(projectTable.id, task.projectId))
          .limit(1);
        if (!project) {
          throw new HTTPException(404, { message: "Project not found" });
        }
        await assertVersionInWorkspace(versionId, project.workspaceId, tx);
      }

      const [updatedTask] = await tx
        .update(taskTable)
        .set({ versionId })
        .where(eq(taskTable.id, id))
        .returning();

      if (!updatedTask) {
        throw new HTTPException(500, {
          message: "Failed to update task version",
        });
      }

      return updatedTask;
    },
  );

  await publishTaskMutation(existingTask, updatedTask, currentUserId, {
    fields: ["versionId"],
  });

  return updatedTask;
}

export default updateTaskVersion;
