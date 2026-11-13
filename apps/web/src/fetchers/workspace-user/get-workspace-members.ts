import { client } from "@kaneo/libs";
import { HttpError } from "@/lib/http-error";

async function getWorkspaceMembers(workspaceId: string) {
  const response = await client.workspace[":workspaceId"].members.$get({
    param: { workspaceId },
    query: {},
  });
  if (!response.ok) throw await HttpError.fromResponse(response);
  return response.json();
}

export default getWorkspaceMembers;
