import { z } from "../openapi";

export const taskIdParam = z.object({ taskId: z.string() });

export const taskWatcherParam = z.object({
  taskId: z.string(),
  userId: z.string(),
});
