import { toIsoDate } from "../markdown.js";
import type { ImportedVersion } from "../types.js";
import type { JiraIssue, JiraVersion } from "./api-types.js";

function versionName(version: JiraVersion): string {
  return version.name?.trim() ?? "";
}

// Jira lets an issue carry several fix versions; Kaneo keeps one per task, so
// the first one listed wins.
export function issueVersionKey(issue: JiraIssue): string | undefined {
  const version = (issue.fields?.fixVersions ?? []).find(
    (candidate) => candidate?.id && versionName(candidate),
  );
  return version?.id;
}

export function mapVersions(issues: JiraIssue[]): ImportedVersion[] {
  const byId = new Map<string, ImportedVersion>();
  for (const issue of issues) {
    for (const version of issue.fields?.fixVersions ?? []) {
      const name = versionName(version);
      if (!version?.id || !name || byId.has(version.id)) continue;
      const description = version.description?.trim();
      const releasedAt = version.released
        ? toIsoDate(version.releaseDate) || new Date(0).toISOString()
        : undefined;
      byId.set(version.id, {
        key: version.id,
        name,
        ...(description ? { description } : {}),
        ...(releasedAt ? { releasedAt } : {}),
      });
    }
  }
  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
}
