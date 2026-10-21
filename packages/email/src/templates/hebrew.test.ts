import { render } from "@react-email/render";
import { createElement } from "react";
import { describe, expect, it } from "vite-plus/test";
import MagicLinkEmail from "./magic-link";
import NotificationEmail from "./notification";
import OtpEmail from "./otp";
import PasswordResetEmail from "./password-reset";
import TrialReminderEmail from "./trial-reminder";
import WorkspaceInvitationEmail from "./workspace-invitation";
import { emailHtmlLang, resolveEmailLocale } from "./resolve-locale";
import { getTrialReminderSubject } from "./trial-reminder-copy";

const context = {
  locale: "he-IL",
  email: "owner@example.com",
  instance: "ticktack.example",
  requestedAt: "2026-10-11T14:12:00Z",
  device: { browser: "Firefox", os: "Windows" },
};

const fixtures = [
  {
    name: "OTP",
    element: createElement(OtpEmail, { ...context, otp: "482913" }),
    title: "התחברות לטיקטק",
  },
  {
    name: "magic link",
    element: createElement(MagicLinkEmail, {
      ...context,
      magicLink: "https://ticktack.example/verify?token=test",
    }),
    title: "התחברות לטיקטק",
  },
  {
    name: "password reset",
    element: createElement(PasswordResetEmail, {
      ...context,
      resetLink: "https://ticktack.example/reset?token=test",
      userName: "אדם Adam",
    }),
    title: "איפוס הסיסמה שלך",
  },
  {
    name: "invitation",
    element: createElement(WorkspaceInvitationEmail, {
      locale: "he-IL",
      to: "owner@example.com",
      inviterEmail: "teammate@example.com",
      inviterName: "נועה Noa",
      workspaceName: "הצוות Team",
      invitationLink: "https://ticktack.example/invite",
      role: "חבר",
      expiresAt: "2026-10-14T00:00:00Z",
    }),
    title: "הצטרפות אל",
  },
  {
    name: "notification",
    element: createElement(NotificationEmail, {
      locale: "he-IL",
      title: "הוקצתה לך משימה",
      message: "משימה חדשה לבדיקה",
      actionUrl: "https://ticktack.example/task/TT-123",
      task: {
        ticket: "TT-123",
        title: "בדיקת API v2",
        priority: "high",
        dueDate: "2026-10-14T00:00:00Z",
        column: { name: "בביצוע", count: 2 },
      },
    }),
    title: "הוקצתה לך משימה",
  },
  {
    name: "trial reminder",
    element: createElement(TrialReminderEmail, {
      locale: "he-IL",
      workspaceName: "הצוות Team",
      daysLeft: 2,
      billingUrl: "https://ticktack.example/billing",
      endsAt: "2026-10-14T00:00:00Z",
      email: "owner@example.com",
    }),
    title: "תקופת הניסיון מסתיימת בעוד יומיים",
  },
];

describe("Hebrew transactional email coverage", () => {
  it.each(fixtures)(
    "renders $name in Hebrew with RTL shell and attribution",
    async ({ element, title }) => {
      const html = await render(element);
      expect(html).toContain('lang="he-IL" dir="rtl"');
      expect(html).toContain("direction:rtl");
      expect(html).toContain("text-align:right");
      expect(html).toContain(title);
      expect(html).toContain("מבוסס על Kaneo");
      expect(html).not.toContain("https://kaneo.app/privacy");
      expect(html).not.toMatch(/\{\{\w+\}\}/);
      const plain = await render(element, { plainText: true });
      expect(plain).toContain(title);
      expect(plain).toContain("טיקטק");
    },
  );

  it("keeps verification code cells in physical digit order", async () => {
    const html = await render(fixtures[0]!.element);
    expect(html).toMatch(/<table[^>]*dir="ltr"[^>]*style="[^"]*direction:ltr/);
    expect(html).toContain("482913");
    const slots = [...html.matchAll(/class="k-slot"[^>]*>(\d)<\/div>/g)]
      .map((m) => m[1])
      .join("");
    expect(slots).toBe("482913");
    expect(html).toContain("תוקף הקוד יפוג בעוד 5 דקות.");
  });

  it("isolates URLs and account addresses within RTL content", async () => {
    const html = await render(fixtures[1]!.element);
    expect(html).toMatch(
      /<p[^>]*dir="ltr"[^>]*>[\s\S]*?https:\/\/ticktack\.example\/verify/,
    );
    expect(html).toContain(
      'dir="ltr" style="unicode-bidi:isolate">owner@example.com',
    );
    expect(html).toContain(
      'dir="ltr" style="unicode-bidi:isolate">ticktack.example',
    );
  });

  it("isolates ticket identifiers and localizes task metadata", async () => {
    const html = await render(fixtures[4]!.element);
    expect(html).toContain('dir="ltr" style="unicode-bidi:isolate">TT-123');
    expect(html).toContain('alt="עדיפות גבוהה"');
    expect(html).toContain("אוק׳");
    expect(html).toContain("פתיחת המשימה");
    expect(html).toContain("margin-left:8px");
  });

  it("retains English and handles locale variants and trial plurals", async () => {
    expect(resolveEmailLocale("he-IL")).toBe("he");
    expect(resolveEmailLocale("HE")).toBe("he");
    expect(emailHtmlLang("he")).toBe("he-IL");
    const html = await render(
      createElement(OtpEmail, { otp: "482913", locale: "en-US" }),
    );
    expect(html).toContain('lang="en" dir="ltr"');
    expect(html).toContain("Sign in to TickTack");
    expect(getTrialReminderSubject("צוות", 0, "he-IL")).toContain("הסתיימה");
    expect(getTrialReminderSubject("צוות", 1, "he-IL")).toContain(
      "נותר יום אחד",
    );
    expect(getTrialReminderSubject("צוות", 2, "he-IL")).toContain(
      "נותרו יומיים",
    );
    expect(getTrialReminderSubject("צוות", 3, "he-IL")).toContain(
      "נותרו 3 ימים",
    );
    expect(getTrialReminderSubject("Team", 1, "en-US")).toBe(
      "1 day left on your Team trial",
    );
  });
});
