export type FetchLike = (
  input: string,
  init?: RequestInit,
) => Promise<Response>;

export type ImportedPriority =
  | "no-priority"
  | "low"
  | "medium"
  | "high"
  | "urgent";

export type ImportedColumn = {
  key: string;
  name: string;
  isFinal: boolean;
};

export type ImportedLabel = {
  key: string;
  name: string;
  color: string;
};

export type ImportedPerson = {
  name?: string;
  email?: string;
};

export type ImportedComment = {
  author: ImportedPerson;
  body: string;
  createdAt?: string;
};

export type ImportedVersion = {
  key: string;
  name: string;
  description?: string;
  releasedAt?: string;
};

export type ImportedTask = {
  key: string;
  number?: number;
  columnKey: string | null;
  archived?: boolean;
  title: string;
  description: string;
  priority: ImportedPriority;
  startDate?: string;
  dueDate?: string;
  createdAt?: string;
  assignee?: ImportedPerson;
  labelKeys: string[];
  versionKey?: string;
  comments: ImportedComment[];
};

export type ImportedRelationType = "subtask" | "blocks" | "related";

export type ImportedRelation = {
  sourceKey: string;
  targetKey: string;
  type: ImportedRelationType;
};

/** A task named by its project key and number, e.g. OPS-9, in any project of the source. */
export type ImportedTaskRef = {
  projectKey: string;
  number: number;
};

/**
 * A relation whose ends live in different projects. Kaneo resolves both ends
 * against the workspace once every project of the import run is written, so
 * the link is kept whichever project is imported first.
 */
export type ImportedCrossProjectRelation = {
  source: ImportedTaskRef;
  target: ImportedTaskRef;
  type: ImportedRelationType;
};

export type ImportedProject = {
  name: string;
  key?: string;
  description?: string;
  columns: ImportedColumn[];
  labels: ImportedLabel[];
  versions?: ImportedVersion[];
  tasks: ImportedTask[];
  relations: ImportedRelation[];
  crossProjectRelations?: ImportedCrossProjectRelation[];
  warnings: string[];
};

export type SourceProject = {
  id: string;
  name: string;
  detail?: string;
};

export type ReadProjectOptions = {
  includeComments: boolean;
  onProgress?: (message: string) => void;
  signal?: AbortSignal;
};

export type ImportSource = {
  listProjects(): Promise<SourceProject[]>;
  readProject(
    projectId: string,
    options: ReadProjectOptions,
  ): Promise<ImportedProject>;
};

export type ConnectOptions = {
  fetch?: FetchLike;
  signal?: AbortSignal;
};
