import { toIsoDate } from "../markdown.js";
import type { ImportedComment } from "../types.js";
import type { JiraChangeItem, JiraIssue } from "./api-types.js";
import { FALLBACK_AUTHOR } from "./comments.js";
import { toPerson } from "./people.js";

/** Jira changelog fields worth keeping: who moved, assigned or released it, and when. */
const KEPT_FIELDS: ReadonlyMap<string, string> = new Map([
  ["status", "status"],
  ["assignee", "assignee"],
  ["fix version", "fix version"],
]);

const NOTHING = "(none)";

function describe(item: JiraChangeItem): string | null {
  const field = KEPT_FIELDS.get(item.field?.trim().toLowerCase() ?? "");
  if (!field) return null;
  const from = item.fromString?.trim() || NOTHING;
  const to = item.toString?.trim() || NOTHING;
  if (from === to) return null;
  return `Changed ${field} from "${from}" to "${to}" in Jira.`;
}

/**
 * Turns an issue's Jira change history into dated entries by the person who
 * made each change, so status moves such as an approval keep their author and
 * time once imported.
 */
export function mapHistory(issue: JiraIssue): ImportedComment[] {
  const entries: ImportedComment[] = [];
  for (const history of issue.changelog?.histories ?? []) {
    const lines = (history?.items ?? [])
      .map(describe)
      .filter((line): line is string => Boolean(line));
    if (lines.length === 0) continue;
    const person = toPerson(history.author);
    const createdAt = toIsoDate(history.created);
    entries.push({
      author: {
        name: person?.name ?? person?.email ?? FALLBACK_AUTHOR,
        ...(person?.email ? { email: person.email } : {}),
      },
      body: lines.join("\n\n"),
      ...(createdAt ? { createdAt } : {}),
    });
  }
  return entries;
}

/** Jira returns only the most recent changes of a long history with a search. */
export function historyTruncated(issue: JiraIssue): boolean {
  const changelog = issue.changelog;
  const total = changelog?.total;
  return (
    typeof total === "number" && total > (changelog?.histories?.length ?? 0)
  );
}
