import { Text } from "@react-email/components";
import React from "react";
import { BoardColumn, type BoardColumnIcon } from "../components/board-column";
import { getEmailColumnName } from "../components/default-column-name";
import { EmailButton } from "../components/email-button";
import { EmailFooter } from "../components/email-footer";
import { EmailIntro } from "../components/email-intro";
import { EmailShell } from "../components/email-shell";
import { footerLinks } from "../components/footer-links";
import { type DateInput, formatShortDate } from "../components/format-date";
import { Spacer } from "../components/spacer";
import {
  TaskCard,
  type TaskCardPriority,
  type TaskCardProps,
} from "../components/task-card";
import { colors } from "../components/tokens";
import { emailHtmlLang, resolveEmailLocale } from "./resolve-locale";

void React;

export type NotificationEmailTask = Omit<
  TaskCardProps,
  "dueDate" | "priorityLabel"
> & {
  dueDate?: DateInput;
  column?: {
    slug?: string;
    name: string;
    icon?: BoardColumnIcon;
    count?: number;
  };
};

export type NotificationEmailProps = {
  title: string;
  message: string;
  actionUrl?: string | null;
  actionLabel?: string;
  locale?: string | null;
  breadcrumb?: string;
  task?: NotificationEmailTask;
  settingsUrl?: string;
};

const messages = {
  he: {
    preview: "יש לך התראה חדשה בטיקטק",
    subtitle: "ההתראה נשלחה בהתאם להעדפות המסירה שלך.",
    footer: "התראה מטיקטק",
    actionLabel: "פתיחה בטיקטק",
    openTask: "פתיחת המשימה",
    manage: "ניהול התראות",
    priority: {
      urgent: "עדיפות דחופה",
      high: "עדיפות גבוהה",
      medium: "עדיפות בינונית",
      low: "עדיפות נמוכה",
    },
  },
  en: {
    preview: "You have a new TickTack notification",
    subtitle: "A notification matched your delivery preferences.",
    footer: "TickTack notification",
    actionLabel: "Open in TickTack",
    openTask: "Open task",
    manage: "Manage notifications",
    priority: {
      urgent: "Urgent priority",
      high: "High priority",
      medium: "Medium priority",
      low: "Low priority",
    },
  },
  de: {
    preview: "Du hast eine neue TickTack-Benachrichtigung",
    subtitle:
      "Eine Benachrichtigung entspricht deinen Zustellungs-Einstellungen.",
    footer: "TickTack Benachrichtigung",
    actionLabel: "In TickTack öffnen",
    openTask: "Aufgabe öffnen",
    manage: "Benachrichtigungen verwalten",
    priority: {
      urgent: "Dringende Priorität",
      high: "Hohe Priorität",
      medium: "Mittlere Priorität",
      low: "Niedrige Priorität",
    },
  },
  vi: {
    preview: "Bạn có thông báo mới từ TickTack",
    subtitle: "Một thông báo khớp với tùy chọn nhận thông báo của bạn.",
    footer: "Thông báo TickTack",
    actionLabel: "Mở trong TickTack",
    openTask: "Mở công việc",
    manage: "Quản lý thông báo",
    priority: {
      urgent: "Ưu tiên khẩn cấp",
      high: "Ưu tiên cao",
      medium: "Ưu tiên trung bình",
      low: "Ưu tiên thấp",
    },
  },
  ja: {
    preview: "TickTack の新しい通知",
    subtitle: "配信設定に一致する通知がありました。",
    footer: "TickTack 通知",
    actionLabel: "TickTack で開く",
    openTask: "タスクを開く",
    manage: "通知を管理",
    priority: {
      urgent: "優先度: 緊急",
      high: "優先度: 高",
      medium: "優先度: 中",
      low: "優先度: 低",
    },
  },
  "zh-tw": {
    preview: "你有一則新的 TickTack 通知",
    subtitle: "有一則通知符合你的通知設定。",
    footer: "TickTack 通知",
    actionLabel: "在 TickTack 中開啟",
    openTask: "開啟任務",
    manage: "管理通知",
    priority: {
      urgent: "緊急優先",
      high: "高優先",
      medium: "中優先",
      low: "低優先",
    },
  },
} as const;

const NotificationEmail = ({
  title,
  message,
  actionUrl,
  actionLabel,
  locale,
  breadcrumb,
  task,
  settingsUrl,
}: NotificationEmailProps) => {
  const emailLocale = resolveEmailLocale(locale);
  const copy = messages[emailLocale];
  const lang = emailHtmlLang(emailLocale);
  const priority: TaskCardPriority | undefined = task?.priority;
  const card = task ? (
    <TaskCard
      {...task}
      dueDate={task.dueDate ? formatShortDate(task.dueDate, lang) : undefined}
      priorityLabel={priority ? copy.priority[priority] : undefined}
    />
  ) : null;

  return (
    <EmailShell
      title={title}
      preview={`${message} ${copy.preview}`}
      lang={lang}
    >
      <EmailIntro title={title} subtitle={message} />
      {breadcrumb ? (
        <Text className="k-muted" style={breadcrumbStyle}>
          {breadcrumb}
        </Text>
      ) : null}
      {task?.column ? (
        <BoardColumn
          name={getEmailColumnName(task.column, emailLocale)}
          icon={task.column.icon}
          count={task.column.count}
        >
          {card}
        </BoardColumn>
      ) : (
        card
      )}
      {actionUrl ? (
        <>
          {task ? <Spacer size={20} /> : null}
          <EmailButton href={actionUrl} icon="arrow-up-right-light">
            {actionLabel ?? (task ? copy.openTask : copy.actionLabel)}
          </EmailButton>
        </>
      ) : null}
      <Spacer size={40} />
      <EmailFooter
        title={copy.footer}
        reason={copy.subtitle}
        links={footerLinks(
          emailLocale,
          settingsUrl ? [{ label: copy.manage, href: settingsUrl }] : [],
        )}
      />
    </EmailShell>
  );
};

const breadcrumbStyle = {
  margin: "-16px 0 20px",
  color: colors.mutedForeground,
  fontSize: "14px",
  lineHeight: "20px",
};

NotificationEmail.PreviewProps = {
  title: "Sarah Chen assigned you a task",
  message: "You were assigned to Redesign transactional emails.",
  actionUrl: "https://cloud.kaneo.app/acme/task/KAN-128",
  locale: "en-US",
  breadcrumb: "Acme / Website",
  settingsUrl:
    "https://cloud.kaneo.app/dashboard/settings/account/notifications",
  task: {
    ticket: "KAN-128",
    title: "Redesign transactional emails",
    labels: [
      { name: "Design", color: "#8E51FF" },
      { name: "Email", color: "#00BC7D" },
    ],
    priority: "high",
    priorityLabel: "High priority",
    dueDate: "2026-10-14T00:00:00.000Z",
    dueStatus: "due-soon",
    assigneeInitials: "MK",
    column: {
      slug: "in-progress",
      name: "In Progress",
      icon: "circle-dot",
      count: 3,
    },
  },
} as NotificationEmailProps;

export default NotificationEmail;
