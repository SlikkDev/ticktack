import type { EmailLocale } from "../templates/resolve-locale";
import type { FooterLink } from "./email-footer";

const labels: Record<EmailLocale, { help: string; attribution: string }> = {
  he: { help: "תיעוד Kaneo", attribution: "מבוסס על Kaneo" },
  en: { help: "Kaneo documentation", attribution: "Based on Kaneo" },
  de: { help: "Kaneo-Dokumentation", attribution: "Basiert auf Kaneo" },
  vi: { help: "Tài liệu Kaneo", attribution: "Dựa trên Kaneo" },
  ja: { help: "Kaneo ドキュメント", attribution: "Kaneo をベースに開発" },
  "zh-tw": { help: "Kaneo 文件", attribution: "基於 Kaneo" },
};

export function footerLinks(
  locale: EmailLocale,
  leading: FooterLink[] = [],
): FooterLink[] {
  const copy = labels[locale];
  return [
    ...leading,
    {
      label: locale === "he" ? "טיקטק" : "TickTack",
      href: process.env.KANEO_CLIENT_URL || "https://ticktack.slikk.io",
    },
    { label: copy.help, href: "https://kaneo.app/docs" },
    { label: copy.attribution, href: "https://github.com/usekaneo/kaneo" },
  ];
}
