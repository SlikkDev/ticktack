import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import PageTitle from "@/components/page-title";
import CreateTaskModal from "@/components/shared/modals/create-task-modal";
import { Button } from "@/components/ui/button";
import {
  type AssistantInput,
  type AssistantOutcome,
  runAssistantAction,
} from "@/lib/assistant/run-assistant-action";
import { toast } from "@/lib/toast";

function spokenParam(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

/**
 * Entry point for voice assistants and launcher shortcuts in the native apps,
 * for example /dashboard/assistant/start-timer?task=Call%20the%20plumber. The
 * page carries the action out and moves on to the page that shows its result.
 */
export const Route = createFileRoute(
  "/_layout/_authenticated/dashboard/assistant/$action",
)({
  component: AssistantActionPage,
  validateSearch: (search: Record<string, unknown>): AssistantInput => ({
    title: spokenParam(search.title),
    task: spokenParam(search.task),
    q: spokenParam(search.q),
    feature: spokenParam(search.feature),
  }),
});

type PageState =
  | { status: "working" }
  | { status: "failed" }
  | { status: "create-task"; title?: string };

type Navigate = ReturnType<typeof useNavigate>;

function goTo(
  navigate: Navigate,
  outcome: Exclude<AssistantOutcome, { kind: "create-task" }>,
) {
  switch (outcome.kind) {
    case "dashboard":
      return navigate({ to: "/dashboard", replace: true });
    case "home":
      return navigate({
        to: "/dashboard/workspace/$workspaceId",
        params: { workspaceId: outcome.workspaceId },
        replace: true,
      });
    case "my-tasks":
      return navigate({
        to: "/dashboard/workspace/$workspaceId/my-tasks",
        params: { workspaceId: outcome.workspaceId },
        replace: true,
      });
    case "inbox":
      return navigate({
        to: "/dashboard/workspace/$workspaceId/inbox",
        params: { workspaceId: outcome.workspaceId },
        replace: true,
      });
    case "search":
      return navigate({
        to: "/dashboard/workspace/$workspaceId/search",
        params: { workspaceId: outcome.workspaceId },
        search: { q: outcome.query },
        replace: true,
      });
    case "task":
      return navigate({
        to: "/dashboard/workspace/$workspaceId/project/$projectId/task/$taskId",
        params: {
          workspaceId: outcome.workspaceId,
          projectId: outcome.projectId,
          taskId: outcome.taskId,
        },
        replace: true,
      });
  }
}

function AssistantActionPage() {
  const { t } = useTranslation();
  const { action } = Route.useParams();
  const input = Route.useSearch();
  const navigate = useNavigate();
  const [state, setState] = useState<PageState>({ status: "working" });
  const started = useRef(false);

  useEffect(() => {
    // The action can start or stop a timer, so it runs exactly once even
    // though StrictMode mounts effects twice in development.
    if (started.current) return;
    started.current = true;
    runAssistantAction(action, input).then(
      (outcome) => {
        if (outcome.notice) {
          const message = t(
            `workspace:assistant.${outcome.notice.key}`,
            outcome.notice.params,
          );
          if (outcome.notice.variant === "success") toast.success(message);
          else toast.info(message);
        }
        if (outcome.kind === "create-task") {
          setState({ status: "create-task", title: outcome.title });
          return;
        }
        void goTo(navigate, outcome);
      },
      (error: unknown) => {
        console.error("Assistant action failed", error);
        setState({ status: "failed" });
      },
    );
  }, [action, input, navigate, t]);

  const openWorkspace = () =>
    void navigate({ to: "/dashboard", replace: true });

  return (
    <>
      <PageTitle title={t("workspace:assistant.pageTitle")} />
      <div className="flex min-h-svh flex-col items-center justify-center gap-3 bg-background p-6 text-center">
        {state.status === "failed" ? (
          <>
            <h1 className="font-semibold text-foreground text-lg">
              {t("workspace:assistant.failedTitle")}
            </h1>
            <p className="max-w-sm text-muted-foreground text-sm">
              {t("workspace:assistant.failedDescription")}
            </p>
            <Button size="sm" onClick={openWorkspace}>
              {t("workspace:assistant.openWorkspace")}
            </Button>
          </>
        ) : state.status === "working" ? (
          <>
            <Loader2
              className="size-5 animate-spin text-muted-foreground"
              aria-hidden="true"
            />
            <p role="status" className="text-muted-foreground text-sm">
              {t("workspace:assistant.working")}
            </p>
          </>
        ) : null}
      </div>
      {state.status === "create-task" && (
        <CreateTaskModal
          open
          initialTitle={state.title}
          onClose={openWorkspace}
          instant
        />
      )}
    </>
  );
}
