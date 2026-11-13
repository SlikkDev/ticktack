import { client } from "@kaneo/libs";
import { HttpError } from "@/lib/http-error";

async function getWorkspaceStatusAssignRules(workspaceId: string) {
  const response = await client["status-assign-rule"].workspace[
    ":workspaceId"
  ].$get({ param: { workspaceId } });
  if (!response.ok) throw await HttpError.fromResponse(response);
  return response.json();
}

export default getWorkspaceStatusAssignRules;
