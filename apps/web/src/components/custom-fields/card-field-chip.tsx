import { useTranslation } from "react-i18next";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { CardField } from "./card-fields";
import { CheckboxMark } from "./checkbox-mark";
import { CustomFieldTypeIcon } from "./custom-field-type-icon";
import { formatCustomFieldValue } from "./format-custom-field-value";

export const cardChipClass =
  "inline-flex h-5 min-w-0 shrink-0 items-center gap-1 rounded-[5px] border border-border px-1.5 font-medium text-[11px] text-foreground/85 transition-colors hover:bg-accent";

export function CardFieldChip({ field }: { field: CardField }) {
  const { i18n } = useTranslation();
  const display = formatCustomFieldValue(
    field.type,
    field.value,
    "short",
    i18n?.resolvedLanguage ?? i18n?.language,
  );

  return (
    <Tooltip>
      <TooltipTrigger render={<span className={cardChipClass} />}>
        {field.type === "boolean" ? (
          <>
            <CheckboxMark checked className="size-3" />
            <bdi className="max-w-18 truncate">{field.name}</bdi>
          </>
        ) : (
          <>
            <CustomFieldTypeIcon
              type={field.type}
              className="size-3 shrink-0 text-muted-foreground"
            />
            <span className="sr-only">{field.name}: </span>
            <bdi
              dir={field.type === "number" ? "ltr" : "auto"}
              className="max-w-18 truncate"
            >
              {display?.text}
            </bdi>
            {!!display?.more && (
              <bdi dir="ltr" className="text-muted-foreground">
                +{display.more}
              </bdi>
            )}
          </>
        )}
      </TooltipTrigger>
      <TooltipContent>{field.name}</TooltipContent>
    </Tooltip>
  );
}
