import type { ProjectColumn } from "@/components/project/columns/types";
import { getColumnIcon } from "@/lib/column";
import { useTranslation } from "react-i18next";
import { getStatusDisplayLabel } from "@/lib/i18n/domain";

export function ColumnOptionLabel({ column }: { column: ProjectColumn }) {
  useTranslation();
  return (
    <span className="flex min-w-0 items-center gap-2">
      {getColumnIcon(column.slug, column.isFinal, column.icon)}
      <span className="truncate">
        {getStatusDisplayLabel(column.slug, column.name)}
      </span>
    </span>
  );
}
