import { client } from "@kaneo/libs";

import { HttpError } from "@/lib/http-error";

async function getTaskWatchers(taskId: string) {
  const response = await client["task-watcher"][":taskId"].$get({
    param: { taskId },
  });

  if (!response.ok) {
    throw await HttpError.fromResponse(response);
  }

  return response.json();
}

export default getTaskWatchers;
