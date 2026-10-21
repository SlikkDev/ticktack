import React from "react";
import { emailDirection, isolateText } from "../components/direction";
import { Badge } from "../components/badge";
import { DetailRows } from "../components/detail-rows";
import { EmailFooter } from "../components/email-footer";
import { EmailIntro } from "../components/email-intro";
import { EmailNote } from "../components/email-note";
import { EmailShell } from "../components/email-shell";
import { footerLinks } from "../components/footer-links";
import { type DateInput, formatDate } from "../components/format-date";
import { Frame } from "../components/frame";
import { InvitationCard } from "../components/invitation-card";
import { Spacer } from "../components/spacer";
import { emailHtmlLang, resolveEmailLocale } from "./resolve-locale";

void React;

export type WorkspaceInvitationEmailProps = {
  workspaceName: string;
  inviterName: string;
  inviterEmail: string;
  invitationLink: string;
  to: string;
  locale?: string | null;
  role?: string;
  expiresAt?: DateInput;
  instance?: string;
  copy?: WorkspaceInvitationEmailCopy;
};

export type WorkspaceInvitationEmailCopy = {
  subject: string;
  preview: string;
  title: string;
  subtitle: string;
  cta: string;
  sameEmail: string;
  ignore: string;
  footer: string;
  details?: {
    title: string;
    sentTo: string;
    instance: string;
    role: string;
    expires: string;
  };
};

const DEFAULT_COPY: WorkspaceInvitationEmailCopy = {
  subject: "{{inviterName}} invited you to join {{workspaceName}} on TickTack",
  preview: "You're invited to {{workspaceName}} on TickTack",
  title: "Join {{workspaceName}}",
  subtitle:
    "{{inviterName}} ({{inviterEmail}}) invited you to collaborate in TickTack.",
  cta: "Accept invitation",
  sameEmail: "You can accept with the same email that received this message.",
  ignore: "If this wasn't expected, you can safely ignore this email.",
  footer: "TickTack workspace invitation",
  details: {
    title: "Invitation details",
    sentTo: "Sent to",
    instance: "Instance",
    role: "Role",
    expires: "Expires",
  },
};

const HEBREW_COPY: WorkspaceInvitationEmailCopy = {
  subject: "{{inviterName}} הזמין אותך להצטרף אל {{workspaceName}} בטיקטק",
  preview: "הוזמנת אל {{workspaceName}} בטיקטק",
  title: "הצטרפות אל {{workspaceName}}",
  subtitle: "{{inviterName}} ({{inviterEmail}}) הזמין אותך לשתף פעולה בטיקטק.",
  cta: "אישור הזמנה",
  sameEmail: "אפשר לאשר עם כתובת הדוא״ל שקיבלה את ההודעה הזאת.",
  ignore: "אם ההזמנה לא הייתה צפויה, אפשר להתעלם מההודעה בבטחה.",
  footer: "הזמנה לסביבת עבודה בטיקטק",
  details: {
    title: "פרטי ההזמנה",
    sentTo: "נשלחה אל",
    instance: "שרת",
    role: "תפקיד",
    expires: "תפוגה",
  },
};

function interpolate(template: string, values: Record<string, string>) {
  return template.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => {
    return values[key] ?? "";
  });
}

const WorkspaceInvitationEmail = ({
  workspaceName,
  inviterName,
  inviterEmail,
  invitationLink,
  to,
  locale,
  role,
  expiresAt,
  instance,
  copy: providedCopy,
}: WorkspaceInvitationEmailProps) => {
  const emailLocale = resolveEmailLocale(locale);
  const copy =
    providedCopy ?? (emailLocale === "he" ? HEBREW_COPY : DEFAULT_COPY);
  const lang = locale ?? emailHtmlLang(emailLocale);
  const direction = emailDirection(lang);
  const values = Object.fromEntries(
    Object.entries({ workspaceName, inviterName, inviterEmail }).map(
      ([key, value]) => [key, direction === "rtl" ? isolateText(value) : value],
    ),
  );
  const details = copy.details;
  const detailRows = details
    ? [
        { label: details.sentTo, value: to, direction: "ltr" as const },
        { label: details.instance, value: instance, direction: "ltr" as const },
        { label: details.role, value: role ? <Badge>{role}</Badge> : null },
        {
          label: details.expires,
          value: expiresAt ? formatDate(expiresAt, lang) : undefined,
        },
      ].filter((row) => Boolean(row.value))
    : [];

  return (
    <EmailShell
      title={interpolate(copy.title, values)}
      preview={interpolate(copy.preview, values)}
      lang={lang}
    >
      <EmailIntro
        title={interpolate(copy.title, values)}
        subtitle={interpolate(copy.subtitle, values)}
      />
      <InvitationCard
        workspaceName={workspaceName}
        description={copy.sameEmail}
        cta={copy.cta}
        href={`${invitationLink}?email=${encodeURIComponent(to)}`}
      />
      {details && detailRows.length > 0 ? (
        <>
          <Spacer size={20} />
          <Frame title={details.title} panelPadding="8px 20px">
            <DetailRows rows={detailRows} />
          </Frame>
        </>
      ) : null}
      <EmailNote>{copy.ignore}</EmailNote>
      <EmailFooter
        title={copy.footer}
        links={footerLinks(resolveEmailLocale(locale))}
      />
    </EmailShell>
  );
};

WorkspaceInvitationEmail.PreviewProps = {
  workspaceName: "Acme",
  inviterName: "Sarah Chen",
  inviterEmail: "sarah@acme.com",
  invitationLink: "https://cloud.kaneo.app/invitation/accept/abc123",
  to: "maya@example.com",
  locale: "en-US",
  role: "Member",
  expiresAt: "2026-10-13T14:12:00.000Z",
  instance: "cloud.kaneo.app",
} as WorkspaceInvitationEmailProps;

export default WorkspaceInvitationEmail;
