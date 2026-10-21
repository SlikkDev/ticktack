/** Internal classifiers use upstream wording; user-facing views use error.message. */
export function getErrorMessageForClassification(error: Error): string {
  return "originalMessage" in error && typeof error.originalMessage === "string"
    ? error.originalMessage
    : error.message;
}
