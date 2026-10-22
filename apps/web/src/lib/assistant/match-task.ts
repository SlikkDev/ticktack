export type MatchableTask = {
  id: string;
  title: string;
  number: number | null;
  projectId: string;
};

export type MatchableProject = { id: string; slug: string };

/**
 * Lower-cases, strips accents and punctuation and collapses whitespace, so a
 * spoken "Call the plumber!" matches the task "call the Plumber".
 */
export function normalizeSpoken(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/\p{M}+/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

/**
 * Ranks tasks against a spoken name and returns the best matching tier: a
 * ticket id such as "WEB-12", then an exact title, a title that contains the
 * words, and finally a title that contains every word in any order. Within a
 * tier the input order is kept, which the watch summary already sorts by due
 * date. A tier with several hits is reported as ambiguous rather than guessed
 * at, so "login" with "Login page redesign" and "Fix the login bug" asks.
 *
 * Mirrored by AssistantMatching.swift in apps/mobile so Siri resolves names
 * the same way.
 */
export function matchTasks<T extends MatchableTask>(
  tasks: readonly T[],
  query: string,
  projects: readonly MatchableProject[] = [],
): T[] {
  const needle = normalizeSpoken(query);
  if (!needle) return [];

  const slugs = new Map(
    projects.map((project) => [project.id, normalizeSpoken(project.slug)]),
  );
  const words = needle.split(" ");
  const candidates = tasks.map(
    (task) => [task, normalizeSpoken(task.title)] as const,
  );
  const tiers: ((task: T, title: string) => boolean)[] = [
    (task) => {
      const slug = slugs.get(task.projectId);
      if (task.number === null || slug === undefined) return false;
      return (
        needle === `${slug} ${task.number}` ||
        needle === `${slug}${task.number}`
      );
    },
    (_, title) => title === needle,
    (_, title) => title.includes(needle),
    (_, title) => {
      const own = new Set(title.split(" "));
      return words.every((word) => own.has(word));
    },
  ];

  for (const matches of tiers) {
    const hits = candidates
      .filter(([task, title]) => matches(task, title))
      .map(([task]) => task);
    if (hits.length > 0) return hits;
  }
  return [];
}
