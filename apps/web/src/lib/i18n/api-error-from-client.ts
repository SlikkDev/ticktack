import type { ApiErrorIssue } from "../parse-api-error-body";
import { getApiErrorMessage } from "./api-error-message";

/** BetterAuth returns errors as plain objects; retain their machine-readable data. */
export class ApiClientError extends Error {
  readonly code?: string;
  readonly status?: number;
  readonly issues?: ApiErrorIssue[];
  readonly originalMessage: string;

  constructor(error: unknown, fallback?: string) {
    super(getApiErrorMessage(error, fallback));
    this.name = "ApiClientError";
    const value =
      typeof error === "object" && error !== null
        ? (error as Record<string, unknown>)
        : {};
    this.code = typeof value.code === "string" ? value.code : undefined;
    this.status = typeof value.status === "number" ? value.status : undefined;
    this.originalMessage =
      typeof value.message === "string" && value.message.trim()
        ? value.message
        : (fallback ?? "");
    if (
      Array.isArray(value.issues) &&
      value.issues.every(
        (issue) =>
          typeof issue === "object" &&
          issue !== null &&
          typeof issue.path === "string" &&
          typeof issue.message === "string",
      )
    ) {
      this.issues = value.issues;
    }
  }
}
