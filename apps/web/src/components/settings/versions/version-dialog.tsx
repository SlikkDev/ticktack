import { VersionForm } from "@/components/settings/versions/version-form";
import type { WorkspaceVersion } from "@/components/settings/versions/workspace-version";
import { Dialog, DialogPopup } from "@/components/ui/dialog";

type VersionDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  version: WorkspaceVersion | null;
  workspaceId: string;
};

export function VersionDialog({
  open,
  onOpenChange,
  version,
  workspaceId,
}: VersionDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPopup className="sm:max-w-md">
        <VersionForm
          key={version?.id ?? "new"}
          version={version}
          workspaceId={workspaceId}
          onClose={() => onOpenChange(false)}
        />
      </DialogPopup>
    </Dialog>
  );
}
