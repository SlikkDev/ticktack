import type {
  ImportedCrossProjectRelation,
  ImportedRelation,
  ImportedRelationType,
  ImportedTaskRef,
} from "../types.js";
import type { JiraIssue, JiraIssueLink, JiraLinkedIssue } from "./api-types.js";

export type RelationsResult = {
  relations: ImportedRelation[];
  crossProject: ImportedCrossProjectRelation[];
  external: number;
};

const ISSUE_KEY = /^(.+)-(\d+)$/u;

export function parseIssueKey(
  key: string | null | undefined,
): ImportedTaskRef | undefined {
  const match = ISSUE_KEY.exec(key?.trim() ?? "");
  if (!match) return undefined;
  const number = Number(match[2]);
  if (!Number.isSafeInteger(number) || number < 1) return undefined;
  return { projectKey: match[1] as string, number };
}

function sameProject(a: ImportedTaskRef, b: ImportedTaskRef): boolean {
  return a.projectKey.toUpperCase() === b.projectKey.toUpperCase();
}

function refKey(ref: ImportedTaskRef): string {
  return `${ref.projectKey.toUpperCase()}-${ref.number}`;
}

export function mapRelations(issues: JiraIssue[]): RelationsResult {
  const issueIds = new Set(issues.map((issue) => issue.id));
  const seen = new Set<string>();
  const external = new Set<string>();
  const relations: ImportedRelation[] = [];
  const crossProject: ImportedCrossProjectRelation[] = [];

  function add(
    sourceKey: string | undefined,
    targetKey: string | undefined,
    type: ImportedRelationType,
  ): void {
    if (!sourceKey || !targetKey || sourceKey === targetKey) return;
    const pair =
      type === "related"
        ? [sourceKey, targetKey].sort().join(":")
        : `${sourceKey}:${targetKey}`;
    const id = `${type}:${pair}`;
    if (!issueIds.has(sourceKey) || !issueIds.has(targetKey)) {
      external.add(id);
      return;
    }
    if (seen.has(id)) return;
    seen.add(id);
    relations.push({ sourceKey, targetKey, type });
  }

  // A link to an issue outside this project is kept by key when both ends can
  // be named as PROJECT-NUMBER; the writer resolves it against the workspace.
  function addAcross(
    source: ImportedTaskRef | undefined,
    target: ImportedTaskRef | undefined,
    type: ImportedRelationType,
    fallbackId: string,
  ): void {
    if (!source || !target || sameProject(source, target)) {
      external.add(fallbackId);
      return;
    }
    const ends =
      type === "related"
        ? [refKey(source), refKey(target)].sort().join(":")
        : `${refKey(source)}:${refKey(target)}`;
    const id = `${type}:${ends}`;
    if (seen.has(id)) return;
    seen.add(id);
    crossProject.push({ source, target, type });
  }

  function link(
    issue: JiraIssue,
    other: JiraLinkedIssue,
    type: ImportedRelationType,
    direction: "outward" | "inward",
  ): void {
    const [sourceId, targetId] =
      direction === "outward" ? [issue.id, other.id] : [other.id, issue.id];
    if (issueIds.has(other.id)) {
      add(sourceId, targetId, type);
      return;
    }
    const self = parseIssueKey(issue.key);
    const foreign = parseIssueKey(other.key);
    const pair =
      type === "related"
        ? [sourceId, targetId].sort().join(":")
        : `${sourceId}:${targetId}`;
    addAcross(
      direction === "outward" ? self : foreign,
      direction === "outward" ? foreign : self,
      type,
      `${type}:${pair}`,
    );
  }

  for (const issue of issues) {
    const parent = issue.fields?.parent;
    if (parent?.id) link(issue, parent, "subtask", "inward");
    for (const issueLink of issue.fields?.issuelinks ?? []) {
      const type = isBlocksLink(issueLink) ? "blocks" : "related";
      if (issueLink.outwardIssue)
        link(issue, issueLink.outwardIssue, type, "outward");
      if (issueLink.inwardIssue)
        link(issue, issueLink.inwardIssue, type, "inward");
    }
  }

  return { relations, crossProject, external: external.size };
}

export function isBlocksLink(link: JiraIssueLink): boolean {
  const name = link.type?.name?.trim().toLowerCase();
  const outward = link.type?.outward?.trim().toLowerCase();
  return name === "blocks" || outward === "blocks";
}
