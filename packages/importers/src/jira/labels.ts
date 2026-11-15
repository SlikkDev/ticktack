import type { ImportedLabel } from "../types.js";
import type { JiraIssue } from "./api-types.js";

export const LABEL_PALETTE = [
  "#8b5cf6",
  "#059669",
  "#16a34a",
  "#d97706",
  "#ea580c",
  "#e11d48",
  "#dc2626",
  "#64748b",
] as const;

export function labelColor(name: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < name.length; index++) {
    hash ^= name.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return LABEL_PALETTE[hash % LABEL_PALETTE.length] as string;
}

export function issueTypeName(issue: JiraIssue): string {
  return issue.fields?.issuetype?.name?.trim() ?? "";
}

/** Issue types become labels when a project uses more than one, e.g. Bug and Task. */
export function usesSeveralIssueTypes(issues: JiraIssue[]): boolean {
  return new Set(issues.map(issueTypeName).filter(Boolean)).size > 1;
}

export function issueLabels(issue: JiraIssue, withType = false): string[] {
  const type = withType ? issueTypeName(issue) : "";
  const labels = [...(issue.fields?.labels ?? []), ...(type ? [type] : [])]
    .filter((label): label is string => typeof label === "string")
    .map((label) => label.trim())
    .filter(Boolean);
  return [...new Set(labels)];
}

export function mapLabels(
  issues: JiraIssue[],
  withType = false,
): ImportedLabel[] {
  const names = new Set(
    issues.flatMap((issue) => issueLabels(issue, withType)),
  );
  return [...names]
    .sort((a, b) => a.localeCompare(b))
    .map((name) => ({ key: name, name, color: labelColor(name) }));
}
