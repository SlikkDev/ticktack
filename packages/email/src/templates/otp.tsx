import React from "react";
import { isolateText } from "../components/direction";
import { EmailFooter } from "../components/email-footer";
import { EmailIntro } from "../components/email-intro";
import { EmailNote } from "../components/email-note";
import { EmailShell } from "../components/email-shell";
import { footerLinks } from "../components/footer-links";
import { OtpCode } from "../components/otp-code";
import {
  type RequestContext,
  RequestDetails,
} from "../components/request-details";
import { signInReason } from "../components/security-reasons";
import { OTP_EXPIRY_SECONDS } from "../otp-expiry";
import { emailHtmlLang, resolveEmailLocale } from "./resolve-locale";

void React;

export type OtpEmailProps = RequestContext & {
  otp: string;
  locale?: string | null;
};

const minutes = OTP_EXPIRY_SECONDS / 60;

const messages = {
  he: {
    preview: `יש להזין את הקוד בעמוד ההתחברות. תוקפו יפוג בעוד ${minutes} דקות.`,
    title: "התחברות לטיקטק",
    subtitle:
      "יש להזין את הקוד הזה בעמוד ההתחברות כדי להשלים את הכניסה. הקוד חד־פעמי.",
    codeLabel: "קוד אימות",
    code: "הוא קוד האימות שלך לטיקטק.",
    expiry: `תוקף הקוד יפוג בעוד ${minutes} דקות.`,
    ignoreTitle: "לא ניסית להתחבר?",
    ignore:
      "אפשר להתעלם מההודעה. לא ניתן להיכנס לחשבון ללא הקוד הזה. טיקטק לעולם לא יבקש ממך לשתף אותו.",
    footer: "הודעת אבטחה מטיקטק",
  },
  en: {
    preview: `Enter it on the sign-in page to continue. It expires in ${minutes} minutes.`,
    title: "Sign in to TickTack",
    subtitle:
      "Enter this code on the sign-in page to finish signing in. It works once.",
    codeLabel: "Verification code",
    code: "is your TickTack verification code.",
    expiry: `This code expires in ${minutes} minutes.`,
    ignoreTitle: "Didn't try to sign in?",
    ignore:
      "You can ignore this email. Nobody can get into your account without this code. TickTack will never ask you to share it.",
    footer: "TickTack security email",
  },
  de: {
    preview: `Gib ihn auf der Anmeldeseite ein, um fortzufahren. Er läuft in ${minutes} Minuten ab.`,
    title: "Bei TickTack anmelden",
    subtitle:
      "Gib diesen Code auf der Anmeldeseite ein, um die Anmeldung abzuschließen. Er funktioniert nur einmal.",
    codeLabel: "Bestätigungscode",
    code: "ist dein TickTack Bestätigungscode.",
    expiry: `Dieser Code läuft in ${minutes} Minuten ab.`,
    ignoreTitle: "Du wolltest dich nicht anmelden?",
    ignore:
      "Dann kannst du diese E-Mail ignorieren. Ohne diesen Code kommt niemand in dein Konto. TickTack wird dich nie bitten, ihn weiterzugeben.",
    footer: "TickTack Sicherheits-E-Mail",
  },
  vi: {
    preview: `Nhập mã này trên trang đăng nhập để tiếp tục. Mã hết hạn sau ${minutes} phút.`,
    title: "Đăng nhập vào TickTack",
    subtitle:
      "Nhập mã này trên trang đăng nhập để hoàn tất đăng nhập. Mã chỉ dùng được một lần.",
    codeLabel: "Mã xác minh",
    code: "là mã xác minh TickTack của bạn.",
    expiry: `Mã này sẽ hết hạn sau ${minutes} phút.`,
    ignoreTitle: "Bạn không định đăng nhập?",
    ignore:
      "Bạn có thể bỏ qua email này. Không ai có thể vào tài khoản của bạn nếu không có mã này. TickTack sẽ không bao giờ yêu cầu bạn chia sẻ mã.",
    footer: "Email bảo mật TickTack",
  },
  ja: {
    preview: `サインインページで入力して続行してください。有効期限は${minutes}分です。`,
    title: "TickTack にサインイン",
    subtitle:
      "サインインページでこのコードを入力して、サインインを完了してください。コードは1回のみ有効です。",
    codeLabel: "確認コード",
    code: "はあなたの TickTack 確認コードです。",
    expiry: `このコードの有効期限は${minutes}分です。`,
    ignoreTitle: "サインインしようとしていませんか？",
    ignore:
      "このメールは無視してかまいません。このコードがなければ、誰もあなたのアカウントにアクセスできません。TickTack がコードの共有を求めることはありません。",
    footer: "TickTack セキュリティメール",
  },
  "zh-tw": {
    preview: `在登入頁面輸入以繼續。驗證碼將在 ${minutes} 分鐘後失效。`,
    title: "登入 TickTack",
    subtitle: "在登入頁面輸入此驗證碼以完成登入。驗證碼只能使用一次。",
    codeLabel: "驗證碼",
    code: "是你的 TickTack 驗證碼。",
    expiry: `此驗證碼將在 ${minutes} 分鐘後失效。`,
    ignoreTitle: "沒有嘗試登入？",
    ignore:
      "你可以忽略這封郵件。沒有這組驗證碼，任何人都無法進入你的帳號。TickTack 絕不會要求你分享驗證碼。",
    footer: "TickTack 安全性通知",
  },
} as const;

const OtpEmail = ({
  otp,
  locale,
  email,
  instance,
  requestedAt,
  device,
}: OtpEmailProps) => {
  const emailLocale = resolveEmailLocale(locale);
  const copy = messages[emailLocale];

  return (
    <EmailShell
      title={copy.title}
      preview={copy.preview}
      lang={emailHtmlLang(emailLocale)}
    >
      <EmailIntro title={copy.title} subtitle={copy.subtitle} />
      <OtpCode
        code={otp}
        label={copy.codeLabel}
        hint={`${emailLocale === "he" ? isolateText(otp) : otp} ${copy.code} ${copy.expiry}`}
      />
      <RequestDetails
        locale={emailLocale}
        email={email}
        instance={instance}
        requestedAt={requestedAt}
        device={device}
      />
      <EmailNote title={copy.ignoreTitle}>{copy.ignore}</EmailNote>
      <EmailFooter
        title={copy.footer}
        reason={email ? signInReason[emailLocale](email, instance) : undefined}
        links={footerLinks(emailLocale)}
      />
    </EmailShell>
  );
};

OtpEmail.PreviewProps = {
  otp: "482913",
  locale: "en-US",
  email: "maya@example.com",
  instance: "cloud.kaneo.app",
  requestedAt: "2026-10-11T14:12:00.000Z",
  device: { browser: "Safari", os: "iPhone" },
} as OtpEmailProps;

export default OtpEmail;
