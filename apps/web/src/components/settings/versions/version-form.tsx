import { MilestoneIcon } from "lucide-react";
import { type FormEvent, useId, useState } from "react";
import { useTranslation } from "react-i18next";
import type { WorkspaceVersion } from "@/components/settings/versions/workspace-version";
import { Button } from "@/components/ui/button";
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import useCreateVersion from "@/hooks/mutations/version/use-create-version";
import useUpdateVersion from "@/hooks/mutations/version/use-update-version";
import { toast } from "@/lib/toast";

type VersionFormProps = {
  version: WorkspaceVersion | null;
  workspaceId: string;
  onClose: () => void;
};

export function VersionForm({
  version,
  workspaceId,
  onClose,
}: VersionFormProps) {
  const { t } = useTranslation();
  const createVersion = useCreateVersion();
  const updateVersion = useUpdateVersion();
  const [name, setName] = useState(version?.name ?? "");
  const [description, setDescription] = useState(version?.description ?? "");
  const [error, setError] = useState("");
  const nameId = useId();
  const errorId = useId();
  const descriptionId = useId();
  const isEditing = version !== null;
  const isPending = createVersion.isPending || updateVersion.isPending;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isPending) return;

    const trimmed = name.trim();
    if (!trimmed) {
      setError(t("settings:workspaceVersions.nameRequired"));
      return;
    }

    try {
      if (version) {
        await updateVersion.mutateAsync({
          id: version.id,
          name: trimmed,
          description: description.trim() || null,
        });
        toast.success(t("settings:workspaceVersions.updateSuccess"), {
          icon: MilestoneIcon,
        });
      } else {
        await createVersion.mutateAsync({
          name: trimmed,
          description: description.trim() || null,
          workspaceId,
        });
        toast.success(t("settings:workspaceVersions.createSuccess"), {
          icon: MilestoneIcon,
        });
      }
      onClose();
    } catch (submitError) {
      toast.error(
        submitError instanceof Error
          ? submitError.message
          : t(
              isEditing
                ? "settings:workspaceVersions.updateError"
                : "settings:workspaceVersions.createError",
            ),
      );
    }
  };

  return (
    <form className="contents" noValidate onSubmit={handleSubmit}>
      <DialogHeader>
        <DialogTitle>
          {t(
            isEditing
              ? "settings:workspaceVersions.editVersion"
              : "settings:workspaceVersions.newVersion",
          )}
        </DialogTitle>
        <DialogDescription>
          {t(
            isEditing
              ? "settings:workspaceVersions.editDescription"
              : "settings:workspaceVersions.createDescription",
          )}
        </DialogDescription>
      </DialogHeader>
      <DialogPanel className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor={nameId}>
            {t("settings:workspaceVersions.nameLabel")}
          </Label>
          <Input
            id={nameId}
            value={name}
            placeholder={t("settings:workspaceVersions.namePlaceholder")}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            onChange={(event) => {
              setName(event.target.value);
              setError("");
            }}
          />
          {error ? (
            <p id={errorId} className="text-destructive-foreground text-xs">
              {error}
            </p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor={descriptionId}>
            {t("settings:workspaceVersions.descriptionLabel")}
          </Label>
          <Textarea
            id={descriptionId}
            value={description}
            rows={3}
            placeholder={t("settings:workspaceVersions.descriptionPlaceholder")}
            onChange={(event) => setDescription(event.target.value)}
          />
        </div>
      </DialogPanel>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          {t("common:actions.cancel")}
        </Button>
        <Button type="submit" disabled={isPending}>
          {t(
            isEditing
              ? "settings:workspaceVersions.saveVersion"
              : "settings:workspaceVersions.createVersion",
          )}
        </Button>
      </DialogFooter>
    </form>
  );
}
