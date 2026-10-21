import * as email from "@kaneo/email";
import { eq } from "drizzle-orm";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vite-plus/test";
import db, { schema } from "../../apps/api/src/database";
import { createApp } from "../../apps/api/src/index";
import { drainSignInEmails } from "../../apps/api/src/utils/sign-in-email-tasks";
import { resetTestDatabase } from "./helpers/database";
import { createWorkspaceMember } from "./helpers/fixtures";

const headers = {
  "Content-Type": "application/json",
  Origin: "http://localhost:5173",
};

async function post(path: string, body: unknown, cookie = "") {
  const response = await createApp().app.request(`/api/auth${path}`, {
    method: "POST",
    headers: { ...headers, Cookie: cookie },
    body: JSON.stringify(body),
  });
  await drainSignInEmails();
  return response;
}

async function pendingInvitation() {
  const owner = await createWorkspaceMember({ role: "owner" });
  const [invite] = await db
    .insert(schema.invitationTable)
    .values({
      email: "invitee@example.com",
      workspaceId: owner.workspace.id,
      inviterId: owner.user.id,
      role: "member",
      status: "pending",
      expiresAt: new Date(Date.now() + 60_000),
    })
    .returning();
  return invite;
}

async function requestLink(address: string) {
  const send = vi
    .spyOn(email, "sendMagicLinkEmail")
    .mockResolvedValue(undefined);
  expect((await post("/sign-in/magic-link", { email: address })).status).toBe(
    200,
  );
  expect(send).toHaveBeenCalledTimes(1);
  const data = send.mock.lastCall?.[2] as { magicLink: string };
  const url = new URL(data.magicLink);
  // Ask for the session response instead of following a browser redirect.
  url.searchParams.delete("callbackURL");
  return `${url.pathname}${url.search}`;
}

function verifyLink(path: string) {
  return createApp().app.request(path, { headers });
}

function cookieFrom(response: Response) {
  return response.headers
    .getSetCookie()
    .map((value) => value.split(";")[0])
    .join("; ");
}

beforeEach(async () => {
  await resetTestDatabase();
  vi.stubEnv("DISABLE_REGISTRATION", "true");
});
afterEach(() => vi.unstubAllEnvs());

describe("invite-only magic-link joining", () => {
  it.each([false, true])(
    "preserves account identity and applies the library's migration policy when emailVerified is %s",
    async (emailVerified) => {
      const signup = await post("/sign-up/email", {
        email: "owner@example.com",
        name: "Owner",
        password: "synthetic-password-for-test-only",
      });
      expect(signup.status).toBe(200);
      const { user: original } = await signup.json();
      await db
        .update(schema.userTable)
        .set({ emailVerified })
        .where(eq(schema.userTable.id, original.id));
      const verified = await verifyLink(await requestLink(original.email));
      expect(verified.status).toBe(200);
      const { user: migrated } = await verified.json();
      expect(migrated).toMatchObject({
        id: original.id,
        role: "admin",
        emailVerified: true,
      });
      const accounts = await db
        .select({ providerId: schema.accountTable.providerId })
        .from(schema.accountTable)
        .where(eq(schema.accountTable.userId, original.id));
      expect(accounts).toHaveLength(emailVerified ? 1 : 0);
      const oldSession = await createApp().app.request(
        "/api/auth/get-session",
        {
          headers: { ...headers, Cookie: cookieFrom(signup) },
        },
      );
      expect(Boolean(await oldSession.json())).toBe(emailVerified);
    },
  );

  it("creates a verified invited account, accepts its workspace invite and rejects link replay", async () => {
    const invite = await pendingInvitation();
    const link = await requestLink(invite.email);
    const verified = await verifyLink(link);
    expect(verified.status).toBe(200);
    const { user } = await verified.json();
    expect(user).toMatchObject({ email: invite.email, emailVerified: true });
    expect((await verifyLink(link)).status).toBe(302);
    const cookie = cookieFrom(verified);
    const accepted = await post(
      "/organization/accept-invitation",
      { invitationId: invite.id },
      cookie,
    );
    expect(accepted.status).toBe(200);
    expect(
      await db
        .select()
        .from(schema.workspaceUserTable)
        .where(eq(schema.workspaceUserTable.userId, user.id)),
    ).toEqual([
      expect.objectContaining({
        workspaceId: invite.workspaceId,
        role: "member",
      }),
    ]);
    expect(
      (
        await post(
          "/organization/accept-invitation",
          { invitationId: invite.id },
          cookie,
        )
      ).status,
    ).toBe(400);
  });

  it.each(["canceled", "expired"])(
    "rejects account creation when the invitation becomes %s after the link is issued",
    async (state) => {
      const invite = await pendingInvitation();
      const link = await requestLink(invite.email);
      await db
        .update(schema.invitationTable)
        .set(
          state === "canceled"
            ? { status: "canceled" }
            : { expiresAt: new Date(Date.now() - 1000) },
        )
        .where(eq(schema.invitationTable.id, invite.id));
      expect((await verifyLink(link)).status).toBe(403);
      expect(
        await db
          .select()
          .from(schema.userTable)
          .where(eq(schema.userTable.email, invite.email)),
      ).toHaveLength(0);
    },
  );

  it("does not send a link or create an account for an uninvited address", async () => {
    await pendingInvitation();
    const send = vi
      .spyOn(email, "sendMagicLinkEmail")
      .mockResolvedValue(undefined);
    expect(
      (await post("/sign-in/magic-link", { email: "stranger@example.com" }))
        .status,
    ).toBe(200);
    expect(send).not.toHaveBeenCalled();
    expect(await db.select().from(schema.userTable)).toHaveLength(1);
  });

  it("rejects acceptance by a different authenticated mailbox", async () => {
    const invite = await pendingInvitation();
    const other = await createWorkspaceMember();
    const verified = await verifyLink(await requestLink(other.user.email));
    expect(verified.status).toBe(200);
    expect(
      (
        await post(
          "/organization/accept-invitation",
          { invitationId: invite.id },
          cookieFrom(verified),
        )
      ).status,
    ).toBe(403);
    const [unchanged] = await db
      .select()
      .from(schema.invitationTable)
      .where(eq(schema.invitationTable.id, invite.id));
    expect(unchanged.status).toBe("pending");
  });
});
