import { useState } from "react";
import { useTranslation } from "react-i18next";
import { EmailCodeForm } from "./email-code-form";
import type { AuthCaptcha } from "./use-auth-captcha";

export function MagicLinkForm({
  destination,
  defaultEmail,
  captcha,
  withName = false,
  disabled = false,
}: {
  destination: string;
  defaultEmail?: string;
  captcha: AuthCaptcha;
  withName?: boolean;
  disabled?: boolean;
}) {
  const { t } = useTranslation();
  const [sent, setSent] = useState(false);
  if (sent)
    return (
      <p role="status" className="text-sm text-muted-foreground">
        {t("auth:passwordless.checkEmail")}
      </p>
    );
  return (
    <EmailCodeForm
      defaultEmail={defaultEmail}
      captcha={captcha}
      disabled={disabled}
      withName={withName}
      magicLinkDestination={new URL(
        destination,
        window.location.origin,
      ).toString()}
      onSent={() => setSent(true)}
    />
  );
}
