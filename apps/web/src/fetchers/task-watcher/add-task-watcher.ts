import { client } from "@kaneo/libs";

import { HttpError } from "@/lib/http-error";

async function addTaskWatcher({
  taskId,
  userId,
}: {
  taskId: string;
  userId: string;
}) {
  const response = await client["task-watcher"][":taskId"][":userId"].$put({
    param: { taskId, userId },
  });

  if (!response.ok) {
    throw await HttpError.fromResponse(response);
  }

  return response.json();
}

export default addTaskWatcher;
