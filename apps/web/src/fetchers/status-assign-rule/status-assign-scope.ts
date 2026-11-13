export type StatusAssignScope = { type: "workspace" | "project"; id: string };

export function statusAssignRulesQueryKey(scope: StatusAssignScope) {
  return ["status-assign-rules", scope.type, scope.id] as const;
}
