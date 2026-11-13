import { responseTimestamp, z } from "../openapi";

export const taskWatcherSchema = z
  .object({
    taskId: z.string(),
    userId: z.string(),
    name: z.string().nullable(),
    image: z.string().nullable(),
    createdAt: responseTimestamp,
  })
  .openapi("TaskWatcher");

export const taskWatcherListSchema = z.array(taskWatcherSchema);
