import { client } from "@kaneo/libs";

import { HttpError } from "@/lib/http-error";

async function removeTaskWatcher({
  taskId,
  userId,
}: {
  taskId: string;
  userId: string;
}) {
  const response = await client["task-watcher"][":taskId"][":userId"].$delete({
    param: { taskId, userId },
  });

  if (!response.ok) {
    throw await HttpError.fromResponse(response);
  }

  return response.json();
}

export default removeTaskWatcher;
