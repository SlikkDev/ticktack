import { useTranslation } from "react-i18next";
import { errorMessage } from "@/components/project/error-message";
import { SettingsCard } from "@/components/settings/settings-card";
import { StatusAssignRuleRow } from "@/components/settings/status-assign-rules/status-assign-rule-row";
import type {
  AssignMember,
  AssignRule,
  AssignStatus,
} from "@/components/settings/status-assign-rules/types";
import type { StatusAssignScope } from "@/fetchers/status-assign-rule/status-assign-scope";
import { useSaveStatusAssignRule } from "@/hooks/mutations/status-assign-rule/use-save-status-assign-rule";
import { toast } from "@/lib/toast";

type StatusAssignRulesCardProps = {
  scope: StatusAssignScope;
  statuses: AssignStatus[];
  rules: AssignRule[];
  inheritedRules?: AssignRule[];
  members: AssignMember[];
  canEdit: boolean;
};

export function StatusAssignRulesCard({
  scope,
  statuses,
  rules,
  inheritedRules = [],
  members,
  canEdit,
}: StatusAssignRulesCardProps) {
  const { t } = useTranslation();
  const { mutateAsync: saveRule } = useSaveStatusAssignRule();

  const change = async (status: string, assigneeId: string | null) => {
    try {
      await saveRule({
        scope,
        status,
        assigneeId,
        existingRuleId: rules.find((rule) => rule.status === status)?.id,
      });
    } catch (error) {
      toast.error(errorMessage(error, t("settings:statusAssign.saveError")));
    }
  };

  return (
    <SettingsCard>
      {statuses.map((status) => (
        <StatusAssignRuleRow
          key={status.slug}
          status={status}
          rule={rules.find((rule) => rule.status === status.slug)}
          inherited={inheritedRules.find((rule) => rule.status === status.slug)}
          members={members}
          canEdit={canEdit}
          onChange={(assigneeId) => change(status.slug, assigneeId)}
        />
      ))}
    </SettingsCard>
  );
}
