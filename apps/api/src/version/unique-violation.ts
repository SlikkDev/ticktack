// PostgreSQL raises SQLSTATE 23505 when an insert or update breaks a unique
// constraint; the pg driver exposes it as `code` on the thrown error.
export function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "23505"
  );
}
