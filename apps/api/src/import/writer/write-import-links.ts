import type { ImportedLink } from "@kaneo/importers";
import type db from "../../database";
import { externalLinkTable } from "../../database/schema";
import { chunk } from "./chunk";

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

type TaskLinks = { id: string; links: readonly ImportedLink[] };

const MAX_TITLE_LENGTH = 200;

function isWebUrl(value: string) {
  try {
    const { protocol } = new URL(value);
    return protocol === "https:" || protocol === "http:";
  } catch {
    return false;
  }
}

/** Store each task's link back to its source, e.g. the Jira issue it came from. */
export async function writeImportLinks(
  tx: Transaction,
  tasks: readonly TaskLinks[],
): Promise<number> {
  const rows = tasks.flatMap(({ id: taskId, links }) =>
    links
      .filter((link) => isWebUrl(link.url))
      .map((link) => ({
        taskId,
        resourceType: "url",
        externalId: link.url,
        url: link.url,
        title: link.title.trim().slice(0, MAX_TITLE_LENGTH) || null,
      })),
  );

  for (const batch of chunk(rows)) {
    await tx.insert(externalLinkTable).values(batch);
  }

  return rows.length;
}
