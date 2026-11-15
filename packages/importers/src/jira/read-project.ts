import { SourceHttpError } from "../http.js";
import type { ImportedProject, ReadProjectOptions } from "../types.js";
import type { JiraComment, JiraProject, JiraVersion } from "./api-types.js";
import { readBoardColumns } from "./board.js";
import type { JiraClient } from "./client.js";
import { mapJiraProject } from "./project.js";
import { readComments } from "./read-comments.js";
import { searchProjectIssues } from "./search.js";

export async function readJiraProject(
  client: JiraClient,
  baseUrl: string,
  projectKey: string,
  options: ReadProjectOptions,
): Promise<ImportedProject> {
  const { onProgress } = options;

  onProgress?.("Reading project and board");
  const project = await readProjectDetails(client, projectKey);
  const statusGroups = await client.projectStatuses(project.key);
  const board = await readBoardColumns(client, project.key);
  const versions = await readProjectVersions(client, project.key);

  onProgress?.("Reading issues");
  const issues = await searchProjectIssues(client, project.key, {
    includeComments: options.includeComments,
    onPage: (loaded) => onProgress?.(`Reading issues (${loaded} so far)`),
  });

  let comments = new Map<string, JiraComment[]>();
  if (options.includeComments && issues.length > 0) {
    comments = await readComments(client, issues, onProgress);
  }

  return mapJiraProject({
    baseUrl,
    project,
    statusGroups,
    boardColumns: board.columns,
    boardUnavailable: board.unavailable,
    issues,
    comments,
    versions,
    includeHistory: options.includeComments,
  });
}

/** Versions need only browse access; without it, fall back to the issues' own. */
async function readProjectVersions(
  client: JiraClient,
  projectKey: string,
): Promise<JiraVersion[]> {
  try {
    return await client.projectVersions(projectKey);
  } catch (error) {
    if (error instanceof SourceHttpError && [403, 404].includes(error.status)) {
      return [];
    }
    throw error;
  }
}

async function readProjectDetails(
  client: JiraClient,
  projectKey: string,
): Promise<JiraProject> {
  try {
    return await client.getProject(projectKey);
  } catch (error) {
    if (error instanceof SourceHttpError && error.status === 404) {
      throw new Error(
        `Jira could not find the project "${projectKey}", or this account cannot browse it.`,
      );
    }
    throw error;
  }
}
