import { apiErrorCodeKeys, apiErrorStatusKeys } from "./api-error-codes";
import { isHebrewErrorLocale, translateApiError } from "./api-error-copy";
import { containsServerInternals } from "./api-error-safety";
import { getApiValidationMessage } from "./api-error-validation";

const knownMessages: Readonly<Record<string, string>> = {
  "No project selected for task creation":
    "common:modals.createTask.selectProject",
  "Assignee is not a member of this workspace":
    "common:apiErrors.assigneeNotMember",
  "Assignee does not have access to this project":
    "common:apiErrors.assigneeNoAccess",
  "Start date cannot be after due date. Please adjust the date range.":
    "common:apiErrors.dateRange",
  "Workspace name is required.":
    "settings:workspaceGeneral.validation.nameRequired",
  "Workspace name may not contain URLs.":
    "common:apiErrors.workspaceNameNoUrls",
  "Workspace name may not contain HTML or template characters.":
    "common:apiErrors.workspaceNameNoMarkup",
};

/**
 * Localize at the presentation boundary, preserving the original error object
 * for callers that make decisions from its code, status or validation issues.
 */
export function getApiErrorMessage(error: unknown, fallback?: string): string {
  const value =
    typeof error === "object" && error !== null
      ? (error as Record<string, unknown>)
      : {};
  const sourceMessage =
    (value.name === "HttpError" || value.name === "ApiClientError") &&
    typeof value.originalMessage === "string"
      ? value.originalMessage
      : value.message;
  const message = typeof sourceMessage === "string" ? sourceMessage.trim() : "";
  const code = typeof value.code === "string" ? value.code : "";
  const status = typeof value.status === "number" ? value.status : undefined;
  const serverFailure = status !== undefined && status >= 500;

  // Preserve existing English provider wording, except internal server output.
  if (!isHebrewErrorLocale()) {
    if (serverFailure) {
      return translateApiError(
        Object.hasOwn(apiErrorCodeKeys, code)
          ? apiErrorCodeKeys[code]
          : "common:error.messages.server",
      );
    }
    if (containsServerInternals(message)) {
      return translateApiError("common:error.messages.server");
    }
    return (
      message || fallback || translateApiError("common:error.messages.unknown")
    );
  }

  if (code === "VALIDATION_ERROR") {
    const validationMessage = getApiValidationMessage(value.issues);
    if (validationMessage) return validationMessage;
  }
  // Only exact known messages can override a generic API status/code.
  if (Object.hasOwn(knownMessages, message)) {
    return translateApiError(knownMessages[message]);
  }
  const workspaceNameLimit = message.match(
    /^Workspace name must be (\d+) characters or fewer\.$/,
  );
  if (code === "INVALID_WORKSPACE_NAME" && workspaceNameLimit) {
    return translateApiError("common:apiErrors.validation.maxCharacters", {
      field: translateApiError("common:apiErrors.fields.name"),
      limit: workspaceNameLimit[1],
    });
  }
  if (
    /^Invalid (?:start date|due date|startDate|dueDate|date value) "/i.test(
      message,
    ) ||
    /^(?:start date|due date|startDate|dueDate) cannot be an empty string\./i.test(
      message,
    )
  ) {
    return translateApiError("common:apiErrors.invalidDate");
  }
  if (Object.hasOwn(apiErrorCodeKeys, code)) {
    return translateApiError(apiErrorCodeKeys[code]);
  }
  if (serverFailure || containsServerInternals(message)) {
    return translateApiError("common:error.messages.server");
  }
  if (
    /^(?:Failed to fetch|Load failed|NetworkError|Network request failed)\b/.test(
      message,
    )
  ) {
    return translateApiError("common:error.messages.network");
  }
  if (status !== undefined && Object.hasOwn(apiErrorStatusKeys, status)) {
    return translateApiError(apiErrorStatusKeys[status]);
  }
  // A caller's translation may still be English while Hebrew is loading.
  return fallback && /[\u0590-\u05ff]/.test(fallback)
    ? fallback
    : translateApiError("common:error.messages.unknown");
}
