import { useMutation, useQueryClient } from "@tanstack/react-query";
import saveStatusAssignRule from "@/fetchers/status-assign-rule/save-status-assign-rule";

export function useSaveStatusAssignRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: saveStatusAssignRule,
    // Project pages show inherited workspace rules, so refresh every scope.
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["status-assign-rules"] }),
  });
}
