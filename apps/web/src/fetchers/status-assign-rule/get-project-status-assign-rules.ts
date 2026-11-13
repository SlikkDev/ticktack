import { client } from "@kaneo/libs";
import { HttpError } from "@/lib/http-error";

async function getProjectStatusAssignRules(projectId: string) {
  const response = await client["status-assign-rule"].project[
    ":projectId"
  ].$get({ param: { projectId } });
  if (!response.ok) throw await HttpError.fromResponse(response);
  return response.json();
}

export default getProjectStatusAssignRules;
