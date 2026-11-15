import { toIsoDate } from "../markdown.js";
import type {
  ImportedComment,
  ImportedLink,
  ImportedPriority,
  ImportedTask,
} from "../types.js";
import type { JiraIssue } from "./api-types.js";
import type { HtmlToMarkdown } from "./html.js";
import { issueLabels } from "./labels.js";
import { issueVersionKey } from "./versions.js";
import { toPerson } from "./people.js";

const PRIORITIES: ReadonlyMap<string, ImportedPriority> = new Map([
  ["highest", "urgent"],
  ["blocker", "urgent"],
  ["critical", "urgent"],
  ["high", "high"],
  ["major", "high"],
  ["medium", "medium"],
  ["low", "low"],
  ["minor", "low"],
  ["lowest", "low"],
  ["trivial", "low"],
]);

export type IssueContext = {
  baseUrl: string;
  columnKey: string | null;
  comments: ImportedComment[];
  toMarkdown: HtmlToMarkdown;
  /** Add the issue type as a label. */
  withType?: boolean;
};

export function mapPriority(name: string | null | undefined): ImportedPriority {
  return PRIORITIES.get(name?.trim().toLowerCase() ?? "") ?? "no-priority";
}

export function issueNumber(
  key: string | null | undefined,
): number | undefined {
  const digits = /-(\d+)$/.exec(key?.trim() ?? "")?.[1];
  const number = digits ? Number(digits) : Number.NaN;
  return Number.isSafeInteger(number) && number > 0 ? number : undefined;
}

export function issueDescription(
  issue: JiraIssue,
  toMarkdown: HtmlToMarkdown,
): string {
  const rendered = issue.renderedFields?.description;
  if (typeof rendered === "string") return toMarkdown(rendered);
  const raw = issue.fields?.description;
  return typeof raw === "string" ? raw.trim() : "";
}

/** The issue's page in Jira, so a migrated task still points at its history there. */
export function issueLink(
  baseUrl: string,
  key: string | null | undefined,
): ImportedLink | undefined {
  const issueKey = key?.trim();
  if (!issueKey || !baseUrl) return undefined;
  return {
    url: `${baseUrl.replace(/\/+$/, "")}/browse/${encodeURIComponent(issueKey)}`,
    title: `Jira ${issueKey}`,
  };
}

export function mapIssue(
  issue: JiraIssue,
  context: IssueContext,
): ImportedTask {
  const fields = issue.fields ?? {};
  const number = issueNumber(issue.key);
  const dueDate = toIsoDate(fields.duedate);
  const createdAt = toIsoDate(fields.created);
  const assignee = toPerson(fields.assignee);
  const versionKey = issueVersionKey(issue);
  const link = issueLink(context.baseUrl, issue.key);
  return {
    key: issue.id,
    ...(number !== undefined ? { number } : {}),
    columnKey: context.columnKey,
    title: fields.summary?.trim() || issue.key || "Untitled",
    description: issueDescription(issue, context.toMarkdown),
    priority: mapPriority(fields.priority?.name),
    ...(dueDate ? { dueDate } : {}),
    ...(createdAt ? { createdAt } : {}),
    ...(assignee ? { assignee } : {}),
    labelKeys: issueLabels(issue, context.withType),
    ...(versionKey ? { versionKey } : {}),
    ...(link ? { links: [link] } : {}),
    comments: context.comments,
  };
}
