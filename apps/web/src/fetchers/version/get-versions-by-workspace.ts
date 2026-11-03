import { client } from "@kaneo/libs";
import type { InferResponseType } from "hono/client";
import { HttpError } from "@/lib/http-error";

export type WorkspaceVersion = InferResponseType<
  (typeof client)["version"]["workspace"][":workspaceId"]["$get"],
  200
>[number];

async function getVersionsByWorkspace({
  workspaceId,
}: {
  workspaceId: string;
}) {
  const response = await client.version.workspace[":workspaceId"].$get({
    param: { workspaceId },
    query: {},
  });

  if (!response.ok) {
    throw await HttpError.fromResponse(response);
  }

  return response.json();
}

export default getVersionsByWorkspace;
