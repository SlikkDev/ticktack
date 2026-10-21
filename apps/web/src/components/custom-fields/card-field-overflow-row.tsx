import { useTranslation } from "react-i18next";
import type { CardField } from "./card-fields";
import { CheckboxMark } from "./checkbox-mark";
import { CustomFieldTypeIcon } from "./custom-field-type-icon";
import { formatCustomFieldValue } from "./format-custom-field-value";

export function CardFieldOverflowRow({ field }: { field: CardField }) {
  const { i18n } = useTranslation();
  const display = formatCustomFieldValue(
    field.type,
    field.value,
    "short",
    i18n?.resolvedLanguage ?? i18n?.language,
  );

  return (
    <div className="contents text-xs">
      <CustomFieldTypeIcon
        type={field.type}
        className="size-3.5 text-muted-foreground"
      />
      <bdi className="max-w-32 truncate font-medium text-muted-foreground">
        {field.name}
      </bdi>
      {field.type === "boolean" ? (
        <CheckboxMark checked />
      ) : (
        <span className="flex min-w-0 max-w-44 items-center gap-1.5 font-semibold text-foreground">
          <bdi
            dir={field.type === "number" ? "ltr" : "auto"}
            className="truncate"
          >
            {display?.text}
          </bdi>
          {!!display?.more && (
            <bdi
              dir="ltr"
              className="shrink-0 font-medium text-muted-foreground"
            >
              +{display.more}
            </bdi>
          )}
        </span>
      )}
    </div>
  );
}
