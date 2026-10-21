import { useTranslation } from "react-i18next";
import type { ImportDiagnostic as Diagnostic } from "@/lib/i18n/api-error-import-diagnostic";

export function ImportDiagnostic({
  diagnostic,
  className,
}: {
  diagnostic: Diagnostic;
  className?: string;
}) {
  const { t } = useTranslation();
  return (
    <div className={className}>
      <p>{diagnostic.message}</p>
      {diagnostic.original ? (
        <details className="mt-1">
          <summary className="cursor-pointer underline underline-offset-2">
            {t("common:apiErrors.import.originalDetails")}
          </summary>
          <p
            dir="auto"
            className="mt-1 whitespace-pre-wrap break-words text-start"
          >
            {diagnostic.original}
          </p>
        </details>
      ) : null}
    </div>
  );
}
