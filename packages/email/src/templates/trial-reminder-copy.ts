import { isolateText } from "../components/direction";

export function getTrialReminderCopy(locale?: string | null) {
  if (locale?.toLowerCase().split("-")[0] === "he") {
    return {
      lang: "he-IL",
      title: (days: number) =>
        days <= 0
          ? "תקופת הניסיון הסתיימה"
          : days === 1
            ? "תקופת הניסיון מסתיימת מחר"
            : days === 2
              ? "תקופת הניסיון מסתיימת בעוד יומיים"
              : `תקופת הניסיון מסתיימת בעוד ${days} ימים`,
      preview: (name: string, days: number) =>
        days <= 0
          ? `תקופת הניסיון של ${isolateText(name)} הסתיימה`
          : days === 1
            ? `נותר יום אחד לתקופת הניסיון של ${isolateText(name)}`
            : days === 2
              ? `נותרו יומיים לתקופת הניסיון של ${isolateText(name)}`
              : `נותרו ${days} ימים לתקופת הניסיון של ${isolateText(name)}`,
      subtitle: (days: number) =>
        days <= 0
          ? "סביבת העבודה זמינה לקריאה בלבד עד לבחירת מסלול. שום דבר לא נמחק והנתונים עדיין כאן."
          : "יש לבחור מסלול כדי להמשיך ליצור ולערוך אחרי תקופת הניסיון. הפרויקטים, המשימות והחברים נשמרים כפי שהם.",
      remaining: (days: number) =>
        days <= 0
          ? "הסתיימה"
          : days === 1
            ? "נותר יום אחד"
            : days === 2
              ? "נותרו יומיים"
              : `נותרו ${days} ימים`,
      frame: "תקופת ניסיון בטיקטק",
      workspace: (name: string, end?: string) =>
        end
          ? `סביבת העבודה ${isolateText(name)}, מסתיימת ב־${end}`
          : `סביבת העבודה ${isolateText(name)}`,
      used: (used: number, total: number) => `נוצלו ${used} מתוך ${total} ימים`,
      cta: "בחירת מסלול",
      selfHostTitle: "מעדיפים לארח בעצמכם?",
      selfHost:
        "טיקטק מבוסס על Kaneo וזמין בחינם באירוח עצמי, עם כל התכונות. אפשר לייצא את הנתונים בכל עת ולהעביר אותם לשרת משלכם.",
      footer: "חיוב טיקטק",
      reason: (name: string, email?: string) =>
        email
          ? `נשלח אל ${isolateText(email)} כי החשבון שלך הוא הבעלים של סביבת העבודה ${isolateText(name)} בטיקטק.`
          : "ההודעה נשלחה כי החשבון שלך הוא הבעלים של סביבת העבודה הזאת בטיקטק.",
      billing: "חיוב",
    };
  }
  return {
    lang: "en",
    title: (days: number) =>
      days <= 0
        ? "Your trial has ended"
        : days === 1
          ? "Your trial ends tomorrow"
          : `Your trial ends in ${days} days`,
    preview: (name: string, days: number) =>
      days <= 0
        ? `The trial for ${name} has ended`
        : `${days} ${days === 1 ? "day" : "days"} left on your ${name} trial`,
    subtitle: (days: number) =>
      days <= 0
        ? "Your workspace is read-only until you choose a plan. Nothing has been deleted, and your data is still there."
        : "Choose a plan to keep creating and editing when the trial ends. Your projects, tasks and members stay exactly as they are.",
    remaining: (days: number) =>
      days <= 0 ? "Ended" : `${days} ${days === 1 ? "day" : "days"} left`,
    frame: "TickTack trial",
    workspace: (name: string, end?: string) =>
      end ? `${name} workspace, ends ${end}` : `${name} workspace`,
    used: (used: number, total: number) => `${used} of ${total} days used`,
    cta: "Choose a plan",
    selfHostTitle: "Rather run it yourself?",
    selfHost:
      "TickTack is based on Kaneo and free when you host it, with every feature included. You can export your data at any time and move it to your own server.",
    footer: "TickTack billing",
    reason: (name: string, email?: string) =>
      email
        ? `Sent to ${email} because you own the ${name} workspace on TickTack.`
        : "You are receiving this because you own this workspace on TickTack.",
    billing: "Billing",
  };
}

export function getTrialReminderSubject(
  workspaceName: string,
  daysLeft: number,
  locale?: string | null,
) {
  return getTrialReminderCopy(locale).preview(workspaceName, daysLeft);
}
