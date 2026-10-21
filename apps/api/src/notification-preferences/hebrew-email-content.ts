type Notification = {
  type: string;
  title: string | null;
  content: string | null;
  eventData: unknown;
};

type Content = { title: string; body: string };
const isolate = (value: string) => `\u2068${value}\u2069`;
const statuses: Record<string, string> = {
  "to-do": "לביצוע",
  "in-progress": "בביצוע",
  "in-review": "בבדיקה",
  done: "הושלם",
  archived: "בארכיון",
  planned: "מתוכנן",
};

function leadTime(minutes: unknown) {
  if (typeof minutes !== "number" || !Number.isFinite(minutes) || minutes <= 0)
    return "בקרוב";
  const [value, one, two, other] =
    minutes % 1440 === 0
      ? ([minutes / 1440, "יום", "יומיים", "ימים"] as const)
      : minutes % 60 === 0
        ? ([minutes / 60, "שעה", "שעתיים", "שעות"] as const)
        : ([minutes, "דקה", "שתי דקות", "דקות"] as const);
  return value === 1
    ? `בעוד ${one}`
    : value === 2
      ? `בעוד ${two}`
      : `בעוד ${value} ${other}`;
}

/** Localize generated notification copy, preserving free-form/custom notices. */
export function hebrewEmailContent(
  notification: Notification,
  fallback: Content,
): Content {
  const data =
    notification.eventData && typeof notification.eventData === "object"
      ? (notification.eventData as Record<string, unknown>)
      : {};
  const text = (key: string) =>
    typeof data[key] === "string" ? isolate(data[key]) : null;
  const status = (key: string) =>
    typeof data[key] === "string"
      ? isolate(statuses[data[key]] ?? data[key])
      : null;
  const task = text("taskTitle");
  switch (notification.type) {
    case "task_created":
      return {
        title: "נוצרה משימה חדשה",
        body: task ? `נוצרה משימה חדשה: ${task}` : "נוצרה משימה חדשה בטיקטק.",
      };
    case "workspace_created": {
      const workspace = text("workspaceName");
      return {
        title: "נוצרה סביבת עבודה",
        body: workspace
          ? `נוצרה סביבת עבודה: ${workspace}`
          : "נוצרה סביבת עבודה חדשה בטיקטק.",
      };
    }
    case "task_status_changed": {
      const oldStatus = status("oldStatus");
      const newStatus = status("newStatus");
      return {
        title: "סטטוס המשימה השתנה",
        body:
          task && oldStatus && newStatus
            ? `${task} עברה מ־${oldStatus} אל ${newStatus}.`
            : "סטטוס של משימה בטיקטק השתנה.",
      };
    }
    case "task_assignee_changed":
      return {
        title: "הוקצתה לך משימה",
        body: task ? `המשימה ${task} הוקצתה לך.` : "הוקצתה לך משימה בטיקטק.",
      };
    case "time_entry_created":
      return {
        title: "נוצר דיווח זמן",
        body: task ? `נוצר דיווח זמן עבור ${task}.` : "נוצר דיווח זמן בטיקטק.",
      };
    case "due_date_reminder":
      return {
        title: "מועד המשימה מתקרב",
        body: task
          ? `מועד המשימה ${task} חל ${leadTime(data.leadTimeMinutes)}.`
          : `מועד של משימה חל ${leadTime(data.leadTimeMinutes)}.`,
      };
    case "task_overdue":
      return {
        title: "משימה באיחור",
        body: task ? `מועד המשימה ${task} עבר.` : "מועד של משימה עבר.",
      };
    case "task_mention": {
      const name = text("mentionerName");
      return {
        title: name ? `${name} הזכיר אותך` : "הוזכרת במשימה",
        body: task ? `הוזכרת במשימה ${task}.` : "הוזכרת במשימה בטיקטק.",
      };
    }
    case "task_comment": {
      const name = text("commenterName");
      return {
        title: name ? `${name} הגיב למשימה שלך` : "תגובה חדשה למשימה",
        body: task
          ? `נוספה תגובה חדשה למשימה ${task}.`
          : "נוספה תגובה חדשה למשימה בטיקטק.",
      };
    }
    default:
      return {
        title: notification.title ?? "התראה חדשה מטיקטק",
        body:
          notification.content ??
          (notification.title ? fallback.body : "יש לך התראה חדשה בטיקטק."),
      };
  }
}
