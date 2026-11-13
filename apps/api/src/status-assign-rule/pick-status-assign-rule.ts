type Candidate = { projectId: string | null; assigneeId: string };

// A project rule overrides the workspace rule for the same status.
export function pickStatusAssignRule<T extends Candidate>(
  rules: T[],
  projectId: string,
): T | undefined {
  return (
    rules.find((rule) => rule.projectId === projectId) ??
    rules.find((rule) => rule.projectId === null)
  );
}
