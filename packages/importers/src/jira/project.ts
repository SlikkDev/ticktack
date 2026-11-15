import type { ImportedComment, ImportedProject } from "../types.js";
import type {
  JiraBoardColumn,
  JiraComment,
  JiraIssue,
  JiraIssueTypeStatuses,
  JiraProject,
  JiraStatus,
  JiraVersion,
} from "./api-types.js";
import {
  type ColumnPlan,
  collectStatuses,
  planBoardColumns,
  planStatusColumns,
  resolveColumnKey,
  type StatusCategories,
  statusCategories,
} from "./columns.js";
import { mapComments } from "./comments.js";
import { historyTruncated, mapHistory } from "./history.js";
import { createJiraHtmlToMarkdown } from "./html.js";
import { mapLabels, usesSeveralIssueTypes } from "./labels.js";
import { mapIssue } from "./mapping.js";
import { mapRelations } from "./relations.js";
import { droppedVersionsWarning, mapVersions } from "./versions.js";
import { buildWarnings } from "./warnings.js";

export type JiraProjectData = {
  baseUrl: string;
  project: JiraProject;
  statusGroups: JiraIssueTypeStatuses[];
  boardColumns: JiraBoardColumn[] | null;
  boardUnavailable: boolean;
  issues: JiraIssue[];
  comments: ReadonlyMap<string, JiraComment[]>;
  /** Every version of the project, used or not. */
  versions?: readonly JiraVersion[];
  /** Import status, assignee and fix version changes as dated entries. */
  includeHistory?: boolean;
};

export function mapJiraProject(data: JiraProjectData): ImportedProject {
  const statuses = collectStatuses(data.statusGroups, data.issues);
  const categories = statusCategories(statuses);
  const plan = choosePlan(data.boardColumns, statuses, categories);
  const toMarkdown = createJiraHtmlToMarkdown(data.baseUrl);
  const placed = sortByColumn(data.issues, plan, categories);
  const { relations, crossProject, external } = mapRelations(data.issues);
  const description = data.project.description?.trim();
  const withType = usesSeveralIssueTypes(data.issues);

  return {
    name: data.project.name?.trim() || data.project.key,
    key: data.project.key,
    ...(description ? { description } : {}),
    columns: plan.columns,
    labels: mapLabels(data.issues, withType),
    versions: mapVersions(data.issues, data.versions),
    tasks: placed.map(({ issue, columnKey }) =>
      mapIssue(issue, {
        baseUrl: data.baseUrl,
        columnKey,
        comments: byDate([
          ...mapComments(data.comments.get(issue.id) ?? [], toMarkdown),
          ...(data.includeHistory ? mapHistory(issue) : []),
        ]),
        toMarkdown,
        withType,
      }),
    ),
    relations,
    crossProjectRelations: crossProject,
    warnings: buildWarnings({
      issuesWithAttachments: data.issues
        .filter((issue) => (issue.fields?.attachment?.length ?? 0) > 0)
        .map((issue) => issue.key),
      externalLinks: external,
      boardUnavailable: data.boardUnavailable,
      finalColumns: plan.columns
        .filter((column) => column.isFinal)
        .map((column) => column.name),
      truncatedHistories: data.includeHistory
        ? data.issues.filter(historyTruncated).length
        : 0,
      droppedVersions: droppedVersionsWarning(data.issues),
    }),
  };
}

function choosePlan(
  boardColumns: JiraBoardColumn[] | null,
  statuses: JiraStatus[],
  categories: StatusCategories,
): ColumnPlan {
  const board = boardColumns
    ? planBoardColumns(boardColumns, categories)
    : null;
  return board && board.columns.length > 0
    ? board
    : planStatusColumns(statuses);
}

function sortByColumn(
  issues: JiraIssue[],
  plan: ColumnPlan,
  categories: StatusCategories,
): Array<{ issue: JiraIssue; columnKey: string | null }> {
  const rank = new Map(
    plan.columns.map((column, index) => [column.key, index]),
  );
  return issues
    .map((issue, index) => ({
      issue,
      index,
      columnKey: resolveColumnKey(plan, issue.fields?.status?.id, categories),
    }))
    .sort(
      (a, b) =>
        columnRank(a.columnKey, rank) - columnRank(b.columnKey, rank) ||
        a.index - b.index,
    );
}

function columnRank(
  columnKey: string | null,
  rank: ReadonlyMap<string, number>,
): number {
  return columnKey === null ? -1 : (rank.get(columnKey) ?? rank.size);
}

function byDate(comments: ImportedComment[]): ImportedComment[] {
  return comments
    .map((comment, index) => ({ comment, index }))
    .sort(
      (a, b) =>
        time(a.comment.createdAt) - time(b.comment.createdAt) ||
        a.index - b.index,
    )
    .map(({ comment }) => comment);
}

function time(value: string | undefined): number {
  const parsed = value ? Date.parse(value) : Number.NaN;
  return Number.isNaN(parsed) ? 0 : parsed;
}
