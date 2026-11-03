import { client } from "@kaneo/libs";
import type { InferRequestType } from "hono/client";
import { HttpError } from "@/lib/http-error";

export type UpdateVersionRequest = InferRequestType<
  (typeof client)["version"][":id"]["$put"]
>["json"] &
  InferRequestType<(typeof client)["version"][":id"]["$put"]>["param"];

async function updateVersion({
  id,
  name,
  description,
  released,
}: UpdateVersionRequest) {
  const response = await client.version[":id"].$put({
    param: { id },
    json: { name, description, released },
  });

  if (!response.ok) {
    throw await HttpError.fromResponse(response);
  }

  return response.json();
}

export default updateVersion;
