import type {
  ImportedCrossProjectRelation,
  ImportedProject,
} from "@kaneo/importers";
import { HTTPException } from "hono/http-exception";
import {
  failUnfinishedProjects,
  type ImportRunProject,
} from "./import-run-project";
import { logImportError } from "./log-import-error";
import {
  createImportRunStore,
  type ImportRunStore,
} from "./runs/import-run-store";
import { createProgressThrottle } from "./runs/progress-throttle";
import type { OpenedImportSource } from "./source/open-import-source";
import { writeImportedProject } from "./write-imported-project";
import { unresolvedCrossProjectWarning } from "./writer/plan-cross-project-relations";
import { writeCrossProjectRelations } from "./writer/write-cross-project-relations";

export type ImportJobState = { projects: ImportRunProject[] };

export type ImportJob = {
  runId: string;
  workspaceId: string;
  userId: string;
  includeComments: boolean;
  opened: OpenedImportSource;
  state: ImportJobState;
  signal: AbortSignal;
};

const HEARTBEAT_MS = 20_000;
const STOPPED = "The import was stopped.";
const UNEXPECTED = "The import stopped because of an unexpected error.";
const SAVE_FAILED = "Kaneo could not save this project.";
const CROSS_PROJECT_FAILED =
  "Kaneo could not save this project's links to tasks in other projects.";

/** Links to other projects, kept until every project of the run is written. */
type PendingCrossProjectRelations = {
  index: number;
  relations: ImportedCrossProjectRelation[];
};

function stopReason(signal: AbortSignal) {
  return signal.reason instanceof Error ? signal.reason.message : STOPPED;
}

function updateProject(
  job: ImportJob,
  index: number,
  changes: Partial<ImportRunProject>,
) {
  job.state.projects = job.state.projects.map((project, position) =>
    position === index ? { ...project, ...changes } : project,
  );
  return job.state.projects;
}

async function readSourceProject(
  job: ImportJob,
  store: ImportRunStore,
  sourceId: string,
): Promise<ImportedProject> {
  const progress = createProgressThrottle((message) => {
    void store.save({ message });
  });
  job.opened.resetFailure();
  try {
    return await job.opened.source.readProject(sourceId, {
      includeComments: job.includeComments,
      onProgress: progress.report,
      signal: job.signal,
    });
  } finally {
    progress.cancel();
  }
}

async function importProject(
  job: ImportJob,
  store: ImportRunStore,
  index: number,
  pending: PendingCrossProjectRelations[],
) {
  const entry = job.state.projects[index];
  if (!entry) return;

  await store.save({
    message: `Reading ${entry.name}`,
    projects: updateProject(job, index, { status: "running" }),
  });

  let project: ImportedProject;
  try {
    project = await readSourceProject(job, store, entry.sourceId);
  } catch (error) {
    if (job.signal.aborted) return;
    await store.save({
      projects: updateProject(job, index, {
        status: "failed",
        error: job.opened.describe(error).message,
      }),
    });
    return;
  }

  await store.save({ message: `Saving ${entry.name}` });

  try {
    const written = await writeImportedProject({
      workspaceId: job.workspaceId,
      userId: job.userId,
      source: job.opened.sourceId,
      project,
      includeComments: job.includeComments,
    });
    await store.save({
      projects: updateProject(job, index, {
        status: "completed",
        error: null,
        ...written,
      }),
    });
    if (project.crossProjectRelations?.length) {
      pending.push({ index, relations: project.crossProjectRelations });
    }
  } catch (error) {
    if (!(error instanceof HTTPException)) {
      logImportError("Failed to save an imported project", job.runId, error);
    }
    await store.save({
      projects: updateProject(job, index, {
        status: "failed",
        error: error instanceof HTTPException ? error.message : SAVE_FAILED,
      }),
    });
  }
}

// Each project's links to tasks in other projects are resolved once every
// project is written, so the order of the import does not decide which links
// survive. A project's own row reports what was written and what was not.
async function linkAcrossProjects(
  job: ImportJob,
  store: ImportRunStore,
  pending: PendingCrossProjectRelations[],
) {
  if (pending.length === 0) return;
  await store.save({ message: "Linking tasks across projects" });
  const projectKeys = new Map(
    job.state.projects.flatMap((project) =>
      project.status === "completed" && project.projectSlug
        ? [[project.sourceId, project.projectSlug] as const]
        : [],
    ),
  );
  for (const { index, relations } of pending) {
    const entry = job.state.projects[index];
    if (!entry || entry.status !== "completed") continue;
    try {
      const result = await writeCrossProjectRelations({
        workspaceId: job.workspaceId,
        relations,
        projectKeys,
      });
      updateProject(job, index, {
        counts: {
          ...entry.counts,
          relations: entry.counts.relations + result.written,
        },
        warnings: result.unresolved
          ? [
              ...entry.warnings,
              unresolvedCrossProjectWarning(result.unresolved),
            ]
          : entry.warnings,
      });
    } catch (error) {
      logImportError("Failed to link tasks across projects", job.runId, error);
      updateProject(job, index, {
        warnings: [...entry.warnings, CROSS_PROJECT_FAILED],
      });
    }
  }
  await store.save({ projects: job.state.projects });
}

export async function runImportJob(job: ImportJob): Promise<void> {
  const store = createImportRunStore(job.runId);
  const heartbeat = setInterval(() => {
    void store.save({});
  }, HEARTBEAT_MS);
  heartbeat.unref?.();

  let error: string | null = null;
  try {
    const pending: PendingCrossProjectRelations[] = [];
    for (let index = 0; index < job.state.projects.length; index++) {
      if (job.signal.aborted || store.isDetached()) break;
      await importProject(job, store, index, pending);
    }
    if (!job.signal.aborted && !store.isDetached()) {
      await linkAcrossProjects(job, store, pending);
    }
    if (job.signal.aborted) error = stopReason(job.signal);
  } catch (unexpected) {
    logImportError("Import run failed", job.runId, unexpected);
    error = UNEXPECTED;
  } finally {
    clearInterval(heartbeat);
  }

  if (error) {
    job.state.projects = failUnfinishedProjects(job.state.projects, error);
  }
  await store.finish({
    status: error ? "failed" : "completed",
    error,
    message: null,
    projects: job.state.projects,
    finishedAt: new Date(),
  });
}
