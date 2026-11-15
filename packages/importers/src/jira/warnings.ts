export const BOARD_UNAVAILABLE_WARNING =
  "Jira did not share the board for this project, so columns follow its statuses.";

const LISTED_KEYS = 10;

export type WarningCounts = {
  /** Keys of the issues that have attachments. */
  issuesWithAttachments: string[];
  externalLinks: number;
  boardUnavailable: boolean;
  /** Names of the columns imported as final because Jira files them under Done. */
  finalColumns?: string[];
  /** Issues whose change history Jira returned only in part. */
  truncatedHistories?: number;
  droppedVersions?: string | null;
};

function listKeys(keys: string[]): string {
  const listed = keys.slice(0, LISTED_KEYS).join(", ");
  const rest = keys.length - LISTED_KEYS;
  return rest > 0 ? `${listed}, and ${rest} more` : listed;
}

export function buildWarnings(counts: WarningCounts): string[] {
  const warnings: string[] = [];
  const attached = counts.issuesWithAttachments;
  if (attached.length > 0) {
    warnings.push(
      attached.length === 1
        ? `1 issue has attachments, which are not imported: ${listKeys(attached)}.`
        : `${attached.length} issues have attachments, which are not imported: ${listKeys(attached)}.`,
    );
  }
  if (counts.externalLinks > 0) {
    warnings.push(
      counts.externalLinks === 1
        ? "1 parent or issue link points to an issue Kaneo could not identify, so it was not imported."
        : `${counts.externalLinks} parent or issue links point to issues Kaneo could not identify, so they were not imported.`,
    );
  }
  const finals = counts.finalColumns ?? [];
  if (finals.length > 1) {
    warnings.push(
      `Jira files ${finals.length} statuses under Done, so these columns count tasks as finished: ${finals.join(", ")}. Check each in the project's columns, and turn off "final" for any that is still work in progress.`,
    );
  }
  const truncated = counts.truncatedHistories ?? 0;
  if (truncated > 0) {
    warnings.push(
      truncated === 1
        ? "1 issue has a longer change history than Jira returns at once, so only its latest changes were imported."
        : `${truncated} issues have a longer change history than Jira returns at once, so only their latest changes were imported.`,
    );
  }
  if (counts.droppedVersions) warnings.push(counts.droppedVersions);
  if (counts.boardUnavailable) warnings.push(BOARD_UNAVAILABLE_WARNING);
  return warnings;
}
