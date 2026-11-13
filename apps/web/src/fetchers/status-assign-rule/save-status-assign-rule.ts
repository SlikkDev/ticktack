import { client } from "@kaneo/libs";
import type { StatusAssignScope } from "@/fetchers/status-assign-rule/status-assign-scope";
import { HttpError } from "@/lib/http-error";

async function ensureOk(response: Pick<Response, "ok" | "status" | "text">) {
  if (!response.ok) throw await HttpError.fromResponse(response);
}

// Sets the rule for a status, or removes it when assigneeId is null.
async function saveStatusAssignRule({
  scope,
  status,
  assigneeId,
  existingRuleId,
}: {
  scope: StatusAssignScope;
  status: string;
  assigneeId: string | null;
  existingRuleId?: string;
}) {
  const api = client["status-assign-rule"];
  const workspaceId = scope.id;
  const projectId = scope.id;

  if (assigneeId) {
    const json = { status, assigneeId };
    await ensureOk(
      scope.type === "workspace"
        ? await api.workspace[":workspaceId"].$put({
            param: { workspaceId },
            json,
          })
        : await api.project[":projectId"].$put({ param: { projectId }, json }),
    );
    return;
  }

  if (!existingRuleId) return;
  await ensureOk(
    scope.type === "workspace"
      ? await api.workspace[":workspaceId"][":id"].$delete({
          param: { workspaceId, id: existingRuleId },
        })
      : await api.project[":projectId"][":id"].$delete({
          param: { projectId, id: existingRuleId },
        }),
  );
}

export default saveStatusAssignRule;
