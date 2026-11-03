import { client } from "@kaneo/libs";
import type { InferRequestType } from "hono/client";
import { HttpError } from "@/lib/http-error";

export type CreateVersionRequest = InferRequestType<
  (typeof client)["version"]["$post"]
>["json"];

async function createVersion({
  workspaceId,
  name,
  description,
}: CreateVersionRequest) {
  const response = await client.version.$post({
    json: { workspaceId, name, description },
  });

  if (!response.ok) {
    throw await HttpError.fromResponse(response);
  }

  return response.json();
}

export default createVersion;
