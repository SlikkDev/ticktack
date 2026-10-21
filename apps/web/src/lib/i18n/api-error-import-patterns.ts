export const importMessageKeys: Readonly<Record<string, string>> = {
  "Starting the import": "common:apiErrors.import.starting",
  "Reading board": "common:apiErrors.import.readingBoard",
  "Reading team": "common:apiErrors.import.readingTeam",
  "Reading issues": "common:apiErrors.import.readingIssues",
  "Reading comments": "common:apiErrors.import.readingComments",
  "Reading states, labels and members":
    "common:apiErrors.import.readingMetadata",
  "Reading project and board": "common:apiErrors.import.readingProjectBoard",
  "The import was stopped.": "common:apiErrors.import.stopped",
  "The import was interrupted before it finished.":
    "common:apiErrors.import.interrupted",
  "The import stopped because of an unexpected error.":
    "common:apiErrors.import.unexpected",
  "Kaneo could not save this project.": "common:apiErrors.import.saveFailed",
  "Kaneo is restarting. Start the import again in a minute.":
    "common:apiErrors.import.restarting",
  "Workspace members could not be read, so assignees and comment authors carry over by name only.":
    "common:apiErrors.import.warningMembers",
  "This Kaneo version does not expose task links, so they are not copied.":
    "common:apiErrors.import.warningKaneoLinks",
  "This Kaneo version does not expose comments, so they are not copied.":
    "common:apiErrors.import.warningKaneoComments",
  "Custom fields could not be read with this API key, so they are not listed here.":
    "common:apiErrors.import.warningCustomFieldsUnreadable",
  "Jira did not share the board for this project, so columns follow its statuses.":
    "common:apiErrors.import.warningJiraBoard",
  "Trello does not share members' email addresses, so assignees are matched to Kaneo members by full name.":
    "common:apiErrors.import.warningTrelloNames",
  "Plane did not share the project member list with this token, so some assignee emails may be missing.":
    "common:apiErrors.import.warningPlaneMembers",
};

export type ImportMessagePattern = {
  pattern: RegExp;
  key: string;
  parameters: readonly string[];
};

// Match the legacy English protocol exactly. Unknown provider text is not translated by guesses.
export const importMessagePatterns: readonly ImportMessagePattern[] = [
  {
    pattern: /^Reading issues \((\d+) so far\)$/,
    key: "common:apiErrors.import.readingIssuesCount",
    parameters: ["amount"],
  },
  {
    pattern: /^Reading comments \((\d+) so far\)$/,
    key: "common:apiErrors.import.readingCommentsCount",
    parameters: ["amount"],
  },
  {
    pattern: /^Reading tasks \((\d+) of (\d+)\)$/,
    key: "common:apiErrors.import.readingTasksTotal",
    parameters: ["amount", "total"],
  },
  {
    pattern: /^Reading comments \((\d+) of (\d+)(?: cards)?\)$/,
    key: "common:apiErrors.import.readingCommentsTotal",
    parameters: ["amount", "total"],
  },
  {
    pattern: /^Reading task links \((\d+) of (\d+)\)$/,
    key: "common:apiErrors.import.readingLinksTotal",
    parameters: ["amount", "total"],
  },
  {
    pattern:
      /^Reading (?:task details|comments and task links) \((\d+) of (\d+)\)$/,
    key: "common:apiErrors.import.readingDetailsTotal",
    parameters: ["amount", "total"],
  },
  {
    pattern: /^Reading work items \((\d+)\)$/,
    key: "common:apiErrors.import.readingWorkItems",
    parameters: ["amount"],
  },
  {
    pattern: /^Reading work items \((\d+) of (\d+)\)$/,
    key: "common:apiErrors.import.readingWorkItemsTotal",
    parameters: ["amount", "total"],
  },
  {
    pattern:
      /^Could not sign in to (Linear|Jira|Trello|Plane|PLANKA|Kaneo)\. Check the API key\.$/,
    key: "common:apiErrors.import.sourceAuthApiKey",
    parameters: ["source"],
  },
  {
    pattern:
      /^Could not sign in to (Linear|Jira|Trello|Plane|PLANKA|Kaneo)\. Check the username and password\.$/,
    key: "common:apiErrors.import.sourceAuthPassword",
    parameters: ["source"],
  },
  {
    pattern:
      /^Could not sign in to (Linear|Jira|Trello|Plane|PLANKA|Kaneo)\. Check the API key and token\.$/,
    key: "common:apiErrors.import.sourceAuthKeyToken",
    parameters: ["source"],
  },
  {
    pattern:
      /^Could not sign in to (Linear|Jira|Trello|Plane|PLANKA|Kaneo)\. Check the email and API token, or the personal access token for Jira Data Center\.$/,
    key: "common:apiErrors.import.sourceAuthJira",
    parameters: ["source"],
  },
  {
    pattern:
      /^(Linear|Jira|Trello|Plane|PLANKA|Kaneo) could not find what Kaneo asked for \(HTTP 404\)\. Check the URL\.$/,
    key: "common:apiErrors.import.sourceNotFound",
    parameters: ["source"],
  },
  {
    pattern:
      /^(Linear|Jira|Trello|Plane|PLANKA|Kaneo) is limiting requests\. Try again in a few minutes\.$/,
    key: "common:apiErrors.import.sourceRateLimited",
    parameters: ["source"],
  },
  {
    pattern:
      /^(Linear|Jira|Trello|Plane|PLANKA|Kaneo) returned an error \(HTTP (\d{3})\)\. Try again later\.$/,
    key: "common:apiErrors.import.sourceServerError",
    parameters: ["source", "status"],
  },
  {
    pattern:
      /^(Linear|Jira|Trello|Plane|PLANKA|Kaneo) refused the request \(HTTP (\d{3})\)\.$/,
    key: "common:apiErrors.import.sourceRefused",
    parameters: ["source", "status"],
  },
  {
    pattern:
      /^Could not reach (Linear|Jira|Trello|Plane|PLANKA|Kaneo) at ([\w.:[\]-]+)\.$/,
    key: "common:apiErrors.import.sourceUnreachable",
    parameters: ["source", "host"],
  },
  {
    pattern:
      /^(Linear|Jira|Trello|Plane|PLANKA|Kaneo)(?: at [\w.:[\]-]+)? took too long to answer\.$/,
    key: "common:apiErrors.import.sourceTimeout",
    parameters: ["source"],
  },
  {
    pattern:
      /^(Linear|Jira|Trello|Plane|PLANKA|Kaneo) sent a response Kaneo could not read\.$/,
    key: "common:apiErrors.import.sourceUnreadable",
    parameters: ["source"],
  },
  {
    pattern:
      /^(\d+) tasks? (?:has|have) an assignee whose email address could not be found, so the assignee may not carry over\.$/,
    key: "common:apiErrors.import.warningAssigneeEmail",
    parameters: ["amount"],
  },
  {
    pattern: /^Custom fields are not copied: (.+)\.$/,
    key: "common:apiErrors.import.warningCustomFields",
    parameters: ["names"],
  },
  {
    pattern:
      /^(\d+) tasks? (?:has|have) integration links \(such as GitHub issues\) that are not copied\.$/,
    key: "common:apiErrors.import.warningIntegrationLinks",
    parameters: ["amount"],
  },
  {
    pattern:
      /^(\d+) tasks? (?:references|reference) images or files stored on the source instance\. They are not copied and may not display\.$/,
    key: "common:apiErrors.import.warningAssets",
    parameters: ["amount"],
  },
  {
    pattern:
      /^(\d+) task links? (?:points|point) to tasks in other projects and (?:is|are) not copied\.$/,
    key: "common:apiErrors.import.warningExternalLinks",
    parameters: ["amount"],
  },
  {
    pattern:
      /^(\d+) issues? (?:has|have) attachments, which are not imported\.$/,
    key: "common:apiErrors.import.warningIssueAttachments",
    parameters: ["amount"],
  },
  {
    pattern:
      /^(\d+) parent or issue links? (?:points|point) to (?:another project|other projects), so (?:it was|they were) not imported\.$/,
    key: "common:apiErrors.import.warningExternalLinks",
    parameters: ["amount"],
  },
  {
    pattern: /^(\d+) attachments? (?:was|were) not imported\.$/,
    key: "common:apiErrors.import.warningAttachments",
    parameters: ["amount"],
  },
  {
    pattern:
      /^(\d+) cards? had more than one member\. Kaneo keeps one assignee per task, so only the first member was (?:kept|assigned)\.$/,
    key: "common:apiErrors.import.warningManyAssignees",
    parameters: ["amount"],
  },
  {
    pattern:
      /^(\d+) work (?:item has|items have) more than one assignee\. Kaneo keeps one assignee per task, so only the first was assigned\.$/,
    key: "common:apiErrors.import.warningManyAssignees",
    parameters: ["amount"],
  },
  {
    pattern:
      /^Attachments on (\d+) cards?, custom fields, Power-Up data, and stickers are not imported\.$/,
    key: "common:apiErrors.import.warningTrelloAttachments",
    parameters: ["amount"],
  },
  {
    pattern:
      /^PLANKA hid the assignee email on (\d+) cards?\. Connect with a PLANKA admin account so assignees can be matched by email\.$/,
    key: "common:apiErrors.import.warningPlankaEmails",
    parameters: ["amount"],
  },
  {
    pattern:
      /^(\d+) checklist items? linked to cards on other boards and (?:was|were) not imported\.$/,
    key: "common:apiErrors.import.warningExternalLinks",
    parameters: ["amount"],
  },
  {
    pattern:
      /^(\d+) issues? had more than (\d+) labels; only the first \2 were imported\.$/,
    key: "common:apiErrors.import.warningLabelLimit",
    parameters: ["amount", "limit"],
  },
  {
    pattern:
      /^(\d+) issues? had more than (\d+) linked issues; only the first \2 links were imported\.$/,
    key: "common:apiErrors.import.warningRelationLimit",
    parameters: ["amount", "limit"],
  },
  {
    pattern:
      /^(\d+) tasks? (?:was|were) assigned to (?:someone who is not a member|people who are not members) of this workspace \((.+)\)\. Invite them, then assign the tasks?\.$/,
    key: "common:apiErrors.import.warningUnmatched",
    parameters: ["amount", "names"],
  },
];
