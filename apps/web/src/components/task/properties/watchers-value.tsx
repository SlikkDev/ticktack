import { Eye } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "@/lib/get-initials";

type WatchersValueProps = {
  watchers: { userId: string; name: string | null; image: string | null }[];
};

export function WatchersValue({ watchers }: WatchersValueProps) {
  const { t } = useTranslation();

  if (watchers.length === 0) {
    return (
      <>
        <Eye className="text-muted-foreground" />
        <span className="truncate text-muted-foreground">
          {t("tasks:watchers.add")}
        </span>
      </>
    );
  }

  return (
    <>
      <span className="inline-flex shrink-0 items-center -space-x-1">
        {watchers.slice(0, 3).map((watcher) => (
          <Avatar
            key={watcher.userId}
            className="size-4.5 ring-2 ring-background"
          >
            <AvatarImage src={watcher.image ?? ""} alt="" />
            <AvatarFallback className="font-semibold text-[8px]">
              {getInitials(watcher.name)}
            </AvatarFallback>
          </Avatar>
        ))}
      </span>
      <span className="truncate">
        {watchers.length === 1
          ? watchers[0]?.name
          : t("tasks:watchers.count", { count: watchers.length })}
      </span>
    </>
  );
}
