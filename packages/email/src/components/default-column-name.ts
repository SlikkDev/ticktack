import type { EmailLocale } from "../templates/resolve-locale";

const canonicalColumns = [
  { slug: "to-do", name: "To Do", hebrew: "לביצוע" },
  { slug: "in-progress", name: "In Progress", hebrew: "בביצוע" },
  { slug: "in-review", name: "In Review", hebrew: "בבדיקה" },
  { slug: "done", name: "Done", hebrew: "הושלם" },
] as const;

/** Translate only untouched built-ins; a name alone cannot identify a column. */
export function getEmailColumnName(
  column: { slug?: string; name: string },
  locale: EmailLocale,
): string {
  if (locale !== "he") return column.name;
  const canonical = canonicalColumns.find(
    ({ slug, name }) => slug === column.slug && name === column.name,
  );
  return canonical?.hebrew ?? column.name;
}
