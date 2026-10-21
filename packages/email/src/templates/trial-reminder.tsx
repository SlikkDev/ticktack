import React from "react";
import { EmailButton } from "../components/email-button";
import { EmailFooter } from "../components/email-footer";
import { EmailIntro } from "../components/email-intro";
import { EmailNote } from "../components/email-note";
import { EmailShell } from "../components/email-shell";
import { footerLinks } from "../components/footer-links";
import { type DateInput, formatShortDate } from "../components/format-date";
import { Frame } from "../components/frame";
import { Progress } from "../components/progress";
import { Spacer } from "../components/spacer";
import { getTrialReminderCopy } from "./trial-reminder-copy";
import { resolveEmailLocale } from "./resolve-locale";

void React;

export type TrialReminderEmailProps = {
  workspaceName: string;
  daysLeft: number;
  billingUrl: string;
  trialDays?: number;
  endsAt?: DateInput;
  email?: string;
  locale?: string | null;
};

const TrialReminderEmail = ({
  workspaceName,
  daysLeft,
  billingUrl,
  trialDays = 14,
  endsAt,
  email,
  locale,
}: TrialReminderEmailProps) => {
  const copy = getTrialReminderCopy(locale);
  const used = Math.min(trialDays, Math.max(0, trialDays - daysLeft));
  const endDate = endsAt ? formatShortDate(endsAt, copy.lang) : undefined;

  return (
    <EmailShell
      title={copy.title(daysLeft)}
      preview={copy.preview(workspaceName, daysLeft)}
      lang={copy.lang}
    >
      <EmailIntro
        title={copy.title(daysLeft)}
        subtitle={copy.subtitle(daysLeft)}
      />
      <Frame
        title={copy.frame}
        description={copy.workspace(workspaceName, endDate)}
      >
        <Progress
          label={copy.used(used, trialDays)}
          value={copy.remaining(daysLeft)}
          percent={(used / trialDays) * 100}
        />
      </Frame>
      <Spacer size={20} />
      <EmailButton href={billingUrl} icon="credit-card-light">
        {copy.cta}
      </EmailButton>
      <EmailNote title={copy.selfHostTitle}>{copy.selfHost}</EmailNote>
      <EmailFooter
        title={copy.footer}
        reason={copy.reason(workspaceName, email)}
        links={footerLinks(resolveEmailLocale(copy.lang), [
          { label: copy.billing, href: billingUrl },
        ])}
      />
    </EmailShell>
  );
};

TrialReminderEmail.PreviewProps = {
  workspaceName: "Acme",
  daysLeft: 3,
  billingUrl: "https://cloud.kaneo.app/dashboard/settings/workspace/billing",
  trialDays: 14,
  endsAt: "2026-10-14T00:00:00.000Z",
  email: "maya@example.com",
} as TrialReminderEmailProps;

export default TrialReminderEmail;
