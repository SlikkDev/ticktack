import { toIsoDate } from "../markdown.js";
import type { ImportedVersion } from "../types.js";
import type { JiraIssue, JiraVersion } from "./api-types.js";

const LISTED_ISSUES = 10;

function versionName(version: JiraVersion | null | undefined): string {
  return version?.name?.trim() ?? "";
}

function namedVersions(issue: JiraIssue): JiraVersion[] {
  return (issue.fields?.fixVersions ?? []).filter(
    (candidate): candidate is JiraVersion =>
      Boolean(candidate?.id && versionName(candidate)),
  );
}

function releaseTime(version: JiraVersion): number {
  const time = Date.parse(version.releaseDate ?? "");
  return Number.isNaN(time) ? 0 : time;
}

/**
 * Jira lets an issue carry several fix versions; Kaneo keeps one per task.
 * Keep the release the issue actually shipped in: a released version over an
 * unreleased one, then the latest release date, then the last one listed.
 */
export function primaryVersion(issue: JiraIssue): JiraVersion | undefined {
  let best: JiraVersion | undefined;
  for (const version of namedVersions(issue)) {
    if (!best || compareVersions(version, best) >= 0) best = version;
  }
  return best;
}

function compareVersions(a: JiraVersion, b: JiraVersion): number {
  const released = Number(Boolean(a.released)) - Number(Boolean(b.released));
  return released !== 0 ? released : releaseTime(a) - releaseTime(b);
}

export function issueVersionKey(issue: JiraIssue): string | undefined {
  return primaryVersion(issue)?.id;
}

/** Names the issues whose other fix versions could not be kept on the task. */
export function droppedVersionsWarning(issues: JiraIssue[]): string | null {
  const dropped: string[] = [];
  for (const issue of issues) {
    const versions = namedVersions(issue);
    if (versions.length < 2) continue;
    const kept = primaryVersion(issue);
    const others = versions
      .filter((version) => version.id !== kept?.id)
      .map(versionName);
    dropped.push(
      `${issue.key} keeps ${versionName(kept)}, not ${others.join(", ")}`,
    );
  }
  if (dropped.length === 0) return null;
  const listed = dropped.slice(0, LISTED_ISSUES).join("; ");
  const rest = dropped.length - LISTED_ISSUES;
  const more = rest > 0 ? `; and ${rest} more` : "";
  const count =
    dropped.length === 1
      ? "1 issue has several fix versions"
      : `${dropped.length} issues have several fix versions`;
  return `${count}, and a task keeps one: the latest released (${listed}${more}).`;
}

function toImportedVersion(version: JiraVersion): ImportedVersion {
  const description = version.description?.trim();
  const releasedAt = version.released
    ? toIsoDate(version.releaseDate) || new Date(0).toISOString()
    : undefined;
  return {
    key: version.id,
    name: versionName(version),
    ...(description ? { description } : {}),
    ...(releasedAt ? { releasedAt } : {}),
  };
}

/**
 * The project's versions, including ones no issue uses yet, plus any version
 * an issue names that the project list did not return. Archived versions are
 * kept only when an issue still names them.
 */
export function mapVersions(
  issues: JiraIssue[],
  projectVersions: readonly JiraVersion[] = [],
): ImportedVersion[] {
  const byId = new Map<string, ImportedVersion>();
  const add = (version: JiraVersion | null | undefined) => {
    if (!version?.id || !versionName(version) || byId.has(version.id)) return;
    byId.set(version.id, toImportedVersion(version));
  };
  for (const version of projectVersions) {
    if (!version?.archived) add(version);
  }
  for (const issue of issues) {
    for (const version of issue.fields?.fixVersions ?? []) add(version);
  }
  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
}
