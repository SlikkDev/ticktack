import createTimeEntry from "@/fetchers/time-entry/create-time-entry";
import updateTimeEntry from "@/fetchers/time-entry/update-time-entry";
import getWatchSummary, {
  type WatchSummary,
} from "@/fetchers/watch/get-watch-summary";
import { formatDuration } from "@/lib/format-duration";
import { matchTasks } from "./match-task";
import { resolveActiveWorkspaceId } from "./resolve-active-workspace";

/**
 * Actions the native shells open the app with, as
 * /dashboard/assistant/<action>: Google Assistant App Actions and launcher
 * shortcuts on Android (apps/mobile/android/app/src/main/res/xml/shortcuts.xml).
 * Siri runs the same actions natively on iOS (apps/mobile/ios/App/App/Intents).
 */
export type AssistantInput = {
  title?: string;
  task?: string;
  q?: string;
  feature?: string;
};

export type AssistantNotice = {
  key:
    | "timerStarted"
    | "timerSwitched"
    | "timerAlreadyRunning"
    | "timerStopped"
    | "noRunningTimer"
    | "taskNotFound"
    | "taskAmbiguous"
    | "sayWhichTask";
  params?: Record<string, string>;
  variant: "success" | "info";
};

export type AssistantOutcome = { notice?: AssistantNotice } & (
  | { kind: "dashboard" }
  | { kind: "home"; workspaceId: string }
  | { kind: "my-tasks"; workspaceId: string }
  | { kind: "inbox"; workspaceId: string }
  | { kind: "search"; workspaceId: string; query: string }
  | { kind: "task"; workspaceId: string; projectId: string; taskId: string }
  | { kind: "create-task"; title?: string }
);

function spoken(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function openFeature(
  feature: string | undefined,
  workspaceId: string,
): AssistantOutcome {
  switch (feature) {
    case "new_task":
      return { kind: "create-task" };
    case "my_tasks":
      return { kind: "my-tasks", workspaceId };
    case "inbox":
      return { kind: "inbox", workspaceId };
    default:
      return { kind: "home", workspaceId };
  }
}

async function stopTimer(
  timer: NonNullable<WatchSummary["runningTimer"]>,
  now: Date,
) {
  await updateTimeEntry({
    id: timer.id,
    startTime: timer.startTime,
    endTime: now.toISOString(),
  });
  const seconds = Math.max(
    0,
    Math.round((now.getTime() - new Date(timer.startTime).getTime()) / 1000),
  );
  return formatDuration(seconds);
}

async function startTimer(
  query: string | undefined,
  workspaceId: string,
  now: Date,
): Promise<AssistantOutcome> {
  if (!query) {
    return {
      kind: "my-tasks",
      workspaceId,
      notice: { key: "sayWhichTask", variant: "info" },
    };
  }

  const summary = await getWatchSummary();
  const matches = matchTasks(summary.tasks, query, summary.projects);
  if (matches.length !== 1) {
    return {
      kind: "search",
      workspaceId,
      query,
      notice: {
        key: matches.length === 0 ? "taskNotFound" : "taskAmbiguous",
        params: { query },
        variant: "info",
      },
    };
  }

  const task = matches[0];
  const project = summary.projects.find(
    (candidate) => candidate.id === task.projectId,
  );
  const destination = {
    kind: "task",
    workspaceId: project?.workspaceId ?? workspaceId,
    projectId: task.projectId,
    taskId: task.id,
  } as const;

  const running = summary.runningTimer;
  if (running?.taskId === task.id) {
    return {
      ...destination,
      notice: {
        key: "timerAlreadyRunning",
        params: { title: task.title },
        variant: "info",
      },
    };
  }
  // One timer at a time: switching tasks by voice should not leave the
  // previous entry running in the background.
  if (running) await stopTimer(running, now);
  await createTimeEntry({ taskId: task.id, startTime: now.toISOString() });
  return {
    ...destination,
    notice: running
      ? {
          key: "timerSwitched",
          params: { from: running.taskTitle, to: task.title },
          variant: "success",
        }
      : {
          key: "timerStarted",
          params: { title: task.title },
          variant: "success",
        },
  };
}

async function stopRunningTimer(
  workspaceId: string,
  now: Date,
): Promise<AssistantOutcome> {
  const summary = await getWatchSummary();
  const running = summary.runningTimer;
  if (!running) {
    return {
      kind: "home",
      workspaceId,
      notice: { key: "noRunningTimer", variant: "info" },
    };
  }
  const duration = await stopTimer(running, now);
  return {
    kind: "task",
    workspaceId: running.workspaceId,
    projectId: running.projectId,
    taskId: running.taskId,
    notice: {
      key: "timerStopped",
      params: { title: running.taskTitle, duration },
      variant: "success",
    },
  };
}

/**
 * Carries out one assistant action and says where the app should go next.
 * Every branch ends on an existing page: timers land on the task, a name that
 * matches no single task lands on search with the spoken words, and anything
 * unknown lands on the workspace home.
 */
export async function runAssistantAction(
  action: string,
  input: AssistantInput,
  now: () => Date = () => new Date(),
): Promise<AssistantOutcome> {
  const workspaceId = await resolveActiveWorkspaceId();
  // Without a workspace the dashboard route already knows where to send
  // the user: pending invitations or onboarding.
  if (!workspaceId) return { kind: "dashboard" };

  switch (action) {
    case "create-task":
      return { kind: "create-task", title: spoken(input.title) };
    case "whats-next":
      return { kind: "my-tasks", workspaceId };
    case "open":
      return openFeature(input.feature, workspaceId);
    case "search": {
      const query = spoken(input.q);
      return query
        ? { kind: "search", workspaceId, query }
        : { kind: "home", workspaceId };
    }
    case "start-timer":
      return startTimer(spoken(input.task), workspaceId, now());
    case "stop-timer":
      return stopRunningTimer(workspaceId, now());
    default:
      return { kind: "home", workspaceId };
  }
}
