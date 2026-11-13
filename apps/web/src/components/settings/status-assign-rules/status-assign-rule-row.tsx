import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import type {
  AssignMember,
  AssignRule,
  AssignStatus,
} from "@/components/settings/status-assign-rules/types";
import { SettingsRow } from "@/components/settings/settings-row";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const NO_RULE = "__none__";

type StatusAssignRuleRowProps = {
  status: AssignStatus;
  rule: AssignRule | undefined;
  inherited: AssignRule | undefined;
  members: AssignMember[];
  canEdit: boolean;
  onChange: (assigneeId: string | null) => Promise<void>;
};

export function StatusAssignRuleRow({
  status,
  rule,
  inherited,
  members,
  canEdit,
  onChange,
}: StatusAssignRuleRowProps) {
  const { t } = useTranslation();
  const labelId = useId();
  const [pending, setPending] = useState<string | null>(null);
  const value = pending ?? rule?.assigneeId ?? NO_RULE;
  const memberName = (id: string) => {
    const member = members.find((candidate) => candidate.id === id);
    return member?.name || member?.email || rule?.assigneeName || id;
  };
  const noRuleLabel = inherited
    ? t("settings:statusAssign.useWorkspaceRule", {
        name: inherited.assigneeName ?? memberName(inherited.assigneeId),
      })
    : t("settings:statusAssign.noOne");

  const change = async (next: string | null) => {
    if (!next || next === value) return;
    setPending(next);
    try {
      await onChange(next === NO_RULE ? null : next);
    } finally {
      setPending(null);
    }
  };

  return (
    <SettingsRow
      stack
      title={<span id={labelId}>{status.name}</span>}
      titleClassName="font-normal"
    >
      <Select
        value={value}
        disabled={!canEdit}
        onValueChange={(next) => void change(next)}
      >
        <SelectTrigger
          size="sm"
          aria-labelledby={labelId}
          className="w-full sm:w-56"
        >
          <SelectValue>
            {value === NO_RULE ? (
              <span className="text-muted-foreground">{noRuleLabel}</span>
            ) : (
              memberName(value)
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NO_RULE}>
            <span className="text-muted-foreground">{noRuleLabel}</span>
          </SelectItem>
          {members.map((member) => (
            <SelectItem key={member.id} value={member.id}>
              {member.name || member.email}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </SettingsRow>
  );
}
