import { client } from "@kaneo/libs";
import { HttpError } from "@/lib/http-error";

async function updateTaskVersion(taskId: string, versionId: string | null) {
  const response = await client.task.version[":id"].$put({
    param: { id: taskId },
    json: { versionId },
  });

  if (!response.ok) {
    throw await HttpError.fromResponse(response);
  }

  return response.json();
}

export default updateTaskVersion;
