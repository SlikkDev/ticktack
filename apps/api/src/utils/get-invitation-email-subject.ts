import { getWorkspaceInvitationEmailCopy } from "./get-workspace-invitation-email-copy";

export function getInvitationEmailSubject(
  locale: string | null,
  inviterName: string,
  workspaceName: string,
) {
  const values: Record<string, string> = { inviterName, workspaceName };
  const isHebrew = locale?.toLowerCase().split("-")[0] === "he";

  return getWorkspaceInvitationEmailCopy(locale).subject.replace(
    /\{\{(\w+)\}\}/g,
    (_match, key: string) => {
      const value = values[key] ?? "";
      return isHebrew ? `\u2068${value}\u2069` : value;
    },
  );
}
