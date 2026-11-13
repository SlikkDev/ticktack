export type AssignStatus = { slug: string; name: string };

export type AssignMember = { id: string; name: string; email: string };

export type AssignRule = {
  id: string;
  status: string;
  assigneeId: string;
  assigneeName: string | null;
};
