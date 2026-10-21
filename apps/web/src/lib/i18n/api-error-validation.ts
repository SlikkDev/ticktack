import { translateApiError } from "./api-error-copy";

const fieldKeys: Readonly<Record<string, string>> = {
  title: "common:apiErrors.fields.title",
  name: "common:apiErrors.fields.name",
  email: "common:apiErrors.fields.email",
  password: "common:apiErrors.fields.password",
  newPassword: "common:apiErrors.fields.password",
  description: "common:apiErrors.fields.description",
  content: "common:apiErrors.fields.content",
  priority: "common:apiErrors.fields.priority",
  status: "common:apiErrors.fields.status",
  startDate: "common:apiErrors.fields.startDate",
  dueDate: "common:apiErrors.fields.dueDate",
  url: "common:apiErrors.fields.url",
  color: "common:apiErrors.fields.color",
  key: "common:apiErrors.fields.key",
  assigneeId: "common:apiErrors.fields.assignee",
  position: "common:apiErrors.fields.position",
  limit: "common:apiErrors.fields.limit",
};

function validationKey(message: string): string | undefined {
  if (
    message === "Required" ||
    /^Invalid input: expected \w+, received undefined$/.test(message)
  ) {
    return "common:apiErrors.validation.required";
  }
  if (/^Invalid (?:email|email address)$/i.test(message)) {
    return "common:apiErrors.validation.email";
  }
  if (/^Invalid URL$/i.test(message)) {
    return "common:apiErrors.validation.url";
  }
  if (/^Invalid (?:option|enum value)\b/.test(message)) {
    return "common:apiErrors.validation.option";
  }
  if (
    message === "Expected integer, received float" ||
    message === "Invalid input: expected int, received number"
  ) {
    return "common:apiErrors.validation.integer";
  }
}

const constraintKeys: Readonly<Record<string, string>> = {
  "string:>=": "common:apiErrors.validation.minCharacters",
  "string:<=": "common:apiErrors.validation.maxCharacters",
  "array:>=": "common:apiErrors.validation.minItems",
  "array:<=": "common:apiErrors.validation.maxItems",
  "number:>=": "common:apiErrors.validation.minNumber",
  "number:<=": "common:apiErrors.validation.maxNumber",
  "number:>": "common:apiErrors.validation.greaterThan",
  "number:<": "common:apiErrors.validation.lessThan",
};

/** Only allowlisted labels and numeric constraints reach the rendered message. */
export function getApiValidationMessage(issues: unknown): string | undefined {
  if (!Array.isArray(issues) || issues.length === 0) return undefined;
  const messages: string[] = [];
  for (const issue of issues.slice(0, 3)) {
    if (
      typeof issue !== "object" ||
      issue === null ||
      typeof issue.message !== "string"
    ) {
      continue;
    }
    const fieldName =
      typeof issue.path === "string" ? issue.path.split(".").at(-1) : "";
    const field = translateApiError(
      fieldName && Object.hasOwn(fieldKeys, fieldName)
        ? fieldKeys[fieldName]
        : "common:apiErrors.fields.value",
    );
    const constraint = issue.message.match(
      /^Too (?:small|big): expected (string|array|number) to (?:have |be )([<>]=?)(-?\d+(?:\.\d+)?)(?: characters| items)?$/,
    );
    const key = constraint
      ? constraintKeys[`${constraint[1]}:${constraint[2]}`]
      : validationKey(issue.message);
    const message = translateApiError(
      key ?? "common:apiErrors.validation.invalid",
      { field, ...(constraint ? { limit: constraint[3] } : {}) },
    );
    if (!messages.includes(message)) messages.push(message);
  }
  return messages.length > 0 ? messages.join(" ") : undefined;
}
