import { isHebrewErrorLocale, translateApiError } from "./api-error-copy";
import {
  importMessageKeys,
  importMessagePatterns,
} from "./api-error-import-patterns";
import { containsServerInternals } from "./api-error-safety";

export type ImportDiagnostic = { message: string; original?: string };

function isolated(value: string): string {
  return `\u2068${value.replace(/\p{Bidi_Control}/gu, "")}\u2069`;
}

function getKnownImportMessage(
  message: string,
  projectName?: string,
): string | undefined {
  if (Object.hasOwn(importMessageKeys, message)) {
    return translateApiError(importMessageKeys[message]);
  }
  if (
    projectName &&
    (message === `Reading ${projectName}` ||
      message === `Reading board ${projectName}`)
  ) {
    return translateApiError("common:apiErrors.import.readingProject", {
      name: isolated(projectName),
    });
  }
  if (projectName && message === `Saving ${projectName}`) {
    return translateApiError("common:apiErrors.import.savingProject", {
      name: isolated(projectName),
    });
  }
  for (const { pattern, key, parameters } of importMessagePatterns) {
    const match = message.match(pattern);
    if (!match) continue;
    const values = Object.fromEntries(
      parameters.map((parameter, index) => {
        let value = match[index + 1];
        if (parameter === "names") {
          value = value.replace(
            /, and (\d+) more$/,
            (_, amount: string) =>
              `, ${translateApiError("common:apiErrors.import.moreNames", { amount })}`,
          );
        }
        return [parameter, /^\d+$/.test(value) ? value : isolated(value)];
      }),
    );
    return translateApiError(key, values);
  }
  const renamed = message.match(
    /^Renamed (?:a column|\d+ columns) to avoid conflicts: (.+)\.$/,
  );
  if (renamed) {
    const pairs = [...renamed[1].matchAll(/"([^"]*)" to "([^"]*)"(?:, |$)/g)];
    if (pairs.length && pairs.map((pair) => pair[0]).join("") === renamed[1]) {
      const names = pairs
        .map((pair) =>
          translateApiError("common:apiErrors.import.renamedColumn", {
            before: isolated(pair[1]),
            after: isolated(pair[2]),
          }),
        )
        .join(", ");
      return translateApiError(
        "common:apiErrors.import.warningRenamedColumns",
        { names },
      );
    }
  }
}

/** Unknown import diagnostics are already sanitized by the API, but stay clearly marked as original text. */
export function getImportDiagnostic(
  message: string,
  kind: "progress" | "error" | "warning",
  projectName?: string,
): ImportDiagnostic {
  if (
    containsServerInternals(message) ||
    /\b(?:authorization|password|api[_ -]?key|access[_ -]?token|secret)\s*[:=]\s*\S+/i.test(
      message,
    )
  ) {
    return { message: translateApiError("common:error.messages.server") };
  }
  if (!isHebrewErrorLocale()) return { message };
  const translated = getKnownImportMessage(message, projectName);
  if (translated) return { message: translated };
  const keys = {
    progress: "common:apiErrors.import.progressUnknown",
    error: "common:apiErrors.import.errorUnknown",
    warning: "common:apiErrors.import.warningUnknown",
  };
  return {
    message: translateApiError(keys[kind]),
    ...(message.trim() ? { original: message } : {}),
  };
}
