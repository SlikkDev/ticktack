import { client } from "@kaneo/libs";
import type { InferRequestType } from "hono/client";
import { HttpError } from "@/lib/http-error";

export type DeleteVersionRequest = InferRequestType<
  (typeof client)["version"][":id"]["$delete"]
>["param"];

async function deleteVersion({ id }: DeleteVersionRequest) {
  const response = await client.version[":id"].$delete({ param: { id } });

  if (!response.ok) {
    throw await HttpError.fromResponse(response);
  }

  return response.json();
}

export default deleteVersion;
