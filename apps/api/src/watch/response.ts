import { nullableResponseTimestamp, responseTimestamp, z } from "../openapi";

const watchStatusSchema = z
  .object({
    slug: z.string(),
    name: z.string(),
    isFinal: z.boolean().openapi({
      description: "Moving a task here completes it.",
    }),
  })
  .openapi("WatchStatus");

const watchProjectSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    slug: z.string(),
    workspaceId: z.string(),
    workspaceName: z.string(),
    statuses: z.array(watchStatusSchema).openapi({
      description:
        "The project's columns in board order; their slugs are valid values for updateTaskStatus.",
    }),
  })
  .openapi("WatchProject");

const watchTaskSchema = z
  .object({
    id: z.string(),
    projectId: z.string(),
    number: z.number().nullable(),
    title: z.string(),
    status: z.string().openapi({
      description: "The slug of the column the task sits in.",
    }),
    statusName: z.string().nullable(),
    priority: z.string().openapi({
      description: "One of: no-priority, low, medium, high, urgent.",
    }),
    dueDate: nullableResponseTimestamp,
  })
  .openapi("WatchTask");

const watchRunningTimerSchema = z
  .object({
    id: z.string().openapi({
      description: "The open time entry; close it with updateTimeEntry.",
    }),
    taskId: z.string(),
    taskTitle: z.string(),
    projectId: z.string(),
    projectName: z.string(),
    workspaceId: z.string().openapi({
      description: "With projectId, enough to open the task in the app.",
    }),
    startTime: responseTimestamp,
  })
  .openapi("WatchRunningTimer");

export const watchSummarySchema = z
  .object({
    user: z.object({ id: z.string(), name: z.string() }),
    projects: z.array(watchProjectSchema).openapi({
      description: "Every project that a returned task belongs to.",
    }),
    tasks: z.array(watchTaskSchema).openapi({
      description:
        "Open tasks assigned to the caller, soonest due first and undated last, then by priority.",
    }),
    total: z.number().openapi({
      description:
        "All open tasks assigned to the caller, including any beyond the returned page.",
    }),
    runningTimer: watchRunningTimerSchema.nullable().openapi({
      description: "The caller's most recently started open time entry.",
    }),
    unreadNotifications: z.number(),
  })
  .openapi("WatchSummary");
