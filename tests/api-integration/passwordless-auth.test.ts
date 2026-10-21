import { createHash, randomUUID } from "node:crypto";
import type { WSContext } from "hono/ws";
import { afterAll, beforeEach, describe, expect, it, vi } from "vite-plus/test";

vi.hoisted(() => {
  vi.stubEnv("AUTH_MODE", "passwordless");
  vi.stubEnv("PASSKEY_RP_ID", "localhost");
  vi.stubEnv("DISABLE_REGISTRATION", "true");
  vi.stubEnv("DISABLE_GUEST_ACCESS", "true");
  vi.stubEnv("DISABLE_PASSWORD_REGISTRATION", "true");
  vi.stubEnv("SMTP_HOST", "mail.example.com");
  vi.stubEnv("SMTP_FROM", "app@example.com");
});

import * as email from "@kaneo/email";
import { eq } from "drizzle-orm";
import db, { schema } from "../../apps/api/src/database";
import { createApp } from "../../apps/api/src/index";
import { drainSignInEmails } from "../../apps/api/src/utils/sign-in-email-tasks";
import { resetTestDatabase } from "./helpers/database";
import { createWorkspaceMember } from "./helpers/fixtures";
import { virtualPasskey } from "./helpers/virtual-passkey";
import { auth } from "../../apps/api/src/auth";
import { createAuthCode, exchangeCode } from "../../apps/api/src/mcp/oauth";
import { addUserConnection, removeUserConnection } from "../../apps/api/src/ws";

const headers = {
  "Content-Type": "application/json",
  Origin: "http://localhost:5173",
};
const app = createApp().app;
const cookieFrom = (response: Response) =>
  response.headers
    .getSetCookie()
    .map((value) => value.split(";")[0])
    .join("; ");
async function post(
  path: string,
  body: unknown,
  cookie = "",
  extra: Record<string, string> = {},
) {
  const response = await app.request(`/api/auth${path}`, {
    method: "POST",
    headers: { ...headers, Cookie: cookie, ...extra },
    body: JSON.stringify(body),
  });
  await drainSignInEmails();
  return response;
}
async function requestLink(address: string) {
  const send = vi
    .spyOn(email, "sendMagicLinkEmail")
    .mockResolvedValue(undefined);
  const response = await post("/sign-in/magic-link", {
    email: address,
    callbackURL: "http://localhost:5173/dashboard",
  });
  expect(response.status).toBe(200);
  const delivered = send.mock.lastCall?.[2] as
    | { magicLink: string }
    | undefined;
  expect(delivered).toBeDefined();
  const url = new URL(delivered!.magicLink);
  expect(url.pathname).toBe("/auth/magic-link");
  expect(url.search).toBe("");
  const token = new URLSearchParams(url.hash.slice(1)).get("token")!;
  expect(token).toBeTruthy();
  return token;
}
const confirm = (token: string, extra: Record<string, string> = {}) =>
  post("/magic-link/confirm", { token }, "", extra);
async function invited() {
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
async function signedIn() {
  const { user } = await createWorkspaceMember();
  const response = await confirm(await requestLink(user.email));
  expect(response.status).toBe(200);
  return { user, cookie: cookieFrom(response) };
}

async function registration(cookie: string, key = virtualPasskey()) {
  const options = await app.request(
    "/api/auth/passkey/generate-register-options",
    { headers: { ...headers, Cookie: cookie } },
  );
  expect(options.status).toBe(200);
  return {
    key,
    challenge: (await options.json()).challenge as string,
    cookie: `${cookie}; ${cookieFrom(options)}`,
  };
}
async function authentication() {
  const options = await app.request(
    "/api/auth/passkey/generate-authenticate-options",
    { headers },
  );
  expect(options.status).toBe(200);
  return {
    challenge: (await options.json()).challenge as string,
    cookie: cookieFrom(options),
  };
}

let testTime = Date.now();
beforeEach(async () => {
  // Each scenario starts beyond the SDK's in-memory IP rate window; the
  // application's durable limiter is reset with the isolated database.
  vi.useFakeTimers({ toFake: ["Date"] });
  testTime += 61_000;
  vi.setSystemTime(testTime);
  await resetTestDatabase();
  vi.clearAllMocks();
});
afterAll(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

describe("passwordless invite-only HTTP authentication", () => {
  it("allows a verified invited newcomer, sets cookies and rejects link replay", async () => {
    const invite = await invited();
    const token = await requestLink(invite.email);
    const stored = await db.select().from(schema.verificationTable);
    expect(JSON.stringify(stored)).not.toContain(token);
    const response = await confirm(token);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true });
    const cookie = cookieFrom(response);
    expect(cookie).toContain("session_token=");
    expect(
      (
        await post(
          "/organization/accept-invitation",
          { invitationId: invite.id },
          cookie,
        )
      ).status,
    ).toBe(200);
    expect((await confirm(token)).status).toBe(400);
    const [user] = await db
      .select()
      .from(schema.userTable)
      .where(eq(schema.userTable.email, invite.email));
    expect(user.emailVerified).toBe(true);
    expect(await db.select().from(schema.accountTable)).toHaveLength(0);
  });

  it("does not consume a token on scanner GETs or untrusted POST origins", async () => {
    const invite = await invited();
    const token = await requestLink(invite.email);
    expect(
      (
        await app.request(`/api/auth/magic-link/verify?token=${token}`, {
          headers,
        })
      ).status,
    ).toBe(404);
    expect(
      (
        await app.request(`/api/auth/magic-link/verify/?token=${token}`, {
          headers,
        })
      ).status,
    ).toBe(404);
    expect(
      (await confirm(token, { Origin: "https://untrusted.example" })).status,
    ).toBe(403);
    expect((await confirm(token)).status).toBe(200);
  });

  it.each(["canceled", "expired"])(
    "rejects a %s invitation at redemption",
    async (state) => {
      const invite = await invited();
      const token = await requestLink(invite.email);
      await db
        .update(schema.invitationTable)
        .set(
          state === "canceled"
            ? { status: "canceled" }
            : { expiresAt: new Date(0) },
        )
        .where(eq(schema.invitationTable.id, invite.id));
      expect((await confirm(token)).status).toBe(403);
      expect(
        await db
          .select()
          .from(schema.userTable)
          .where(eq(schema.userTable.email, invite.email)),
      ).toHaveLength(0);
    },
  );

  it("rejects expired tokens", async () => {
    const invite = await invited();
    const token = await requestLink(invite.email);
    await db.update(schema.verificationTable).set({ expiresAt: new Date(0) });
    expect((await confirm(token)).status).toBe(400);
  });

  it("gives an uninvited address the generic response without sending mail", async () => {
    await invited();
    const send = vi
      .spyOn(email, "sendMagicLinkEmail")
      .mockResolvedValue(undefined);
    expect(
      (await post("/sign-in/magic-link", { email: "stranger@example.com" }))
        .status,
    ).toBe(200);
    expect(send).not.toHaveBeenCalled();
  });

  it.each([
    "/sign-up/email",
    "/sign-in/email",
    "/request-password-reset",
    "/reset-password",
    "/set-password",
    "/change-password",
    "/admin/set-user-password",
    "/sign-in/social",
    "/sign-in/oauth2",
    "/sign-in/email-otp",
    "/sign-in/anonymous",
  ])("blocks alternative route %s", async (path) => {
    await invited();
    const result = await post(path, {
      email: "stranger@example.com",
      password: "synthetic-test-password",
      name: "Test",
      provider: "google",
      newPassword: "synthetic-test-password",
      currentPassword: "synthetic-test-password",
      token: "test",
      userId: "test",
      otp: "123456",
      providerId: "custom",
    });
    expect([400, 403, 404]).toContain(result.status);
    expect(await db.select().from(schema.userTable)).toHaveLength(1);
    expect(await db.select().from(schema.sessionTable)).toHaveLength(0);
  });

  it("requires user verification in authentication options", async () => {
    const response = await app.request(
      "/api/auth/passkey/generate-authenticate-options",
      { headers },
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      rpId: "localhost",
      userVerification: "required",
    });
  });

  it("requires fresh verified browser sessions to enroll and rejects bearer authentication", async () => {
    const { user, cookie } = await signedIn();
    const request = (extra = {}) =>
      app.request("/api/auth/passkey/generate-register-options", {
        headers: { ...headers, Cookie: cookie, ...extra },
      });
    const options = await request();
    expect(options.status).toBe(200);
    expect(await options.json()).toMatchObject({
      rp: { id: "localhost" },
      authenticatorSelection: { userVerification: "required" },
    });
    expect(
      (await request({ Authorization: "Bearer invalid" })).status,
    ).not.toBe(200);
    await db
      .update(schema.sessionTable)
      .set({ createdAt: new Date(Date.now() - 301_000) })
      .where(eq(schema.sessionTable.userId, user.id));
    expect((await request()).status).toBe(401);
    await db.update(schema.sessionTable).set({ createdAt: new Date() });
    await db
      .update(schema.userTable)
      .set({ emailVerified: false })
      .where(eq(schema.userTable.id, user.id));
    expect((await request()).status).toBe(403);
  });

  it("revokes pre-verification API keys and passkeys when proving an unverified mailbox", async () => {
    const { user } = await createWorkspaceMember();
    await db
      .update(schema.userTable)
      .set({ emailVerified: false })
      .where(eq(schema.userTable.id, user.id));
    await db.insert(schema.apikeyTable).values({
      referenceId: user.id,
      key: randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await db.insert(schema.passkeyTable).values({
      id: randomUUID(),
      userId: user.id,
      credentialID: randomUUID(),
      publicKey: "synthetic",
      counter: 0,
      deviceType: "singleDevice",
      backedUp: false,
    });
    expect((await confirm(await requestLink(user.email))).status).toBe(200);
    expect(await db.select().from(schema.apikeyTable)).toHaveLength(0);
    expect(await db.select().from(schema.passkeyTable)).toHaveLength(0);
  });

  it("limits mail requests per address and bounds confirmation bodies", async () => {
    await invited();
    for (let i = 0; i < 3; i++)
      expect(
        (await post("/sign-in/magic-link", { email: "stranger@example.com" }))
          .status,
      ).toBe(200);
    expect(
      (await post("/sign-in/magic-link", { email: "stranger@example.com" }))
        .status,
    ).toBe(429);
    expect((await confirm("a".repeat(5000))).status).toBe(413);
  });

  it("registers multiple real signed passkeys, authenticates and rejects challenge replay", async () => {
    const { cookie } = await signedIn();
    for (let i = 0; i < 2; i++) {
      const enrollment = await registration(cookie);
      expect(
        (
          await post(
            "/passkey/verify-registration",
            {
              response: enrollment.key.registration(enrollment.challenge),
              name: `Device ${i}`,
            },
            enrollment.cookie,
          )
        ).status,
      ).toBe(200);
      const login = await authentication();
      const body = { response: enrollment.key.authentication(login.challenge) };
      const response = await post(
        "/passkey/verify-authentication",
        body,
        login.cookie,
      );
      expect(response.status).toBe(200);
      expect(cookieFrom(response)).toContain("session_token=");
      expect(
        (await post("/passkey/verify-authentication", body, login.cookie))
          .status,
      ).not.toBe(200);
    }
    expect(await db.select().from(schema.passkeyTable)).toHaveLength(2);
  });

  it.each(["verification", "origin", "rp"])(
    "rejects registration with invalid %s",
    async (invalid) => {
      const { cookie } = await signedIn();
      const enrollment = await registration(cookie);
      const response = enrollment.key.registration(
        enrollment.challenge,
        invalid !== "verification",
        invalid === "origin" ? "https://untrusted.example" : undefined,
        invalid === "rp" ? "untrusted.example" : undefined,
      );
      expect(
        (
          await post(
            "/passkey/verify-registration",
            { response },
            enrollment.cookie,
          )
        ).status,
      ).not.toBe(200);
      expect(await db.select().from(schema.passkeyTable)).toHaveLength(0);
    },
  );

  it.each(["verification", "origin", "rp"])(
    "rejects authentication with invalid %s",
    async (invalid) => {
      const { cookie } = await signedIn();
      const enrollment = await registration(cookie);
      expect(
        (
          await post(
            "/passkey/verify-registration",
            { response: enrollment.key.registration(enrollment.challenge) },
            enrollment.cookie,
          )
        ).status,
      ).toBe(200);
      const login = await authentication();
      const response = enrollment.key.authentication(
        login.challenge,
        1,
        invalid !== "verification",
        invalid === "origin" ? "https://untrusted.example" : undefined,
        invalid === "rp" ? "untrusted.example" : undefined,
      );
      expect(
        (
          await post(
            "/passkey/verify-authentication",
            { response },
            login.cookie,
          )
        ).status,
      ).not.toBe(200);
    },
  );

  it("does not permit a second user to remove another user's key", async () => {
    const first = await signedIn();
    const enrollment = await registration(first.cookie);
    expect(
      (
        await post(
          "/passkey/verify-registration",
          { response: enrollment.key.registration(enrollment.challenge) },
          enrollment.cookie,
        )
      ).status,
    ).toBe(200);
    const [key] = await db.select().from(schema.passkeyTable);
    const second = await signedIn();
    expect(
      (await post("/passkey/delete-passkey", { id: key.id }, second.cookie))
        .status,
    ).not.toBe(200);
    expect(await db.select().from(schema.passkeyTable)).toHaveLength(1);
  });

  it("rejects a magic verification interrupted by an email ownership change", async () => {
    const { user } = await createWorkspaceMember();
    const token = await requestLink(user.email);
    const context = await auth.$context;
    const original = context.adapter.findOne.bind(context.adapter);
    let release!: () => void;
    const blocked = new Promise<void>((resolve) => {
      release = resolve;
    });
    let reached!: () => void;
    const paused = new Promise<void>((resolve) => {
      reached = resolve;
    });
    let once = true;
    vi.spyOn(context.adapter, "findOne").mockImplementation(async (args) => {
      const result = await original(args);
      if (
        once &&
        args.model === "user" &&
        args.where.some(
          (clause) => clause.field === "email" && clause.value === user.email,
        )
      ) {
        once = false;
        reached();
        await blocked;
      }
      return result;
    });
    const pending = confirm(token);
    await paused;
    await context.adapter.update({
      model: "user",
      where: [{ field: "id", value: user.id }],
      update: { email: "replacement@example.com", emailVerified: false },
    });
    release();
    expect((await pending).status).not.toBe(200);
    const [updated] = await db
      .select()
      .from(schema.userTable)
      .where(eq(schema.userTable.id, user.id));
    expect(updated.emailVerified).toBe(false);
    expect(await db.select().from(schema.sessionTable)).toHaveLength(0);
  });

  it.each(["registration", "authentication"])(
    "rejects passkey %s when ownership changes immediately before insertion",
    async (flow) => {
      const { user, cookie } = await signedIn();
      const enrollment = await registration(cookie);
      if (flow === "authentication")
        expect(
          (
            await post(
              "/passkey/verify-registration",
              { response: enrollment.key.registration(enrollment.challenge) },
              enrollment.cookie,
            )
          ).status,
        ).toBe(200);
      const login = flow === "authentication" ? await authentication() : null;
      const context = await auth.$context;
      const original = context.adapter.create.bind(context.adapter);
      let release!: () => void, reached!: () => void;
      const blocked = new Promise<void>((resolve) => {
        release = resolve;
      });
      const paused = new Promise<void>((resolve) => {
        reached = resolve;
      });
      let once = true;
      vi.spyOn(context.adapter, "create").mockImplementation(async (args) => {
        if (
          once &&
          args.model === (flow === "registration" ? "passkey" : "session")
        ) {
          once = false;
          reached();
          await blocked;
        }
        return original(args);
      });
      const pending =
        flow === "registration"
          ? post(
              "/passkey/verify-registration",
              { response: enrollment.key.registration(enrollment.challenge) },
              enrollment.cookie,
            )
          : post(
              "/passkey/verify-authentication",
              { response: enrollment.key.authentication(login!.challenge) },
              login!.cookie,
            );
      await paused;
      await context.adapter.update({
        model: "user",
        where: [{ field: "id", value: user.id }],
        update: { email: "replacement@example.com", emailVerified: false },
      });
      release();
      expect((await pending).status).not.toBe(200);
      expect(await db.select().from(schema.passkeyTable)).toHaveLength(0);
      expect(await db.select().from(schema.sessionTable)).toHaveLength(0);
    },
  );

  it("revokes pending device/MCP grants and closes existing sockets on first mailbox proof", async () => {
    const { user } = await createWorkspaceMember();
    await db
      .update(schema.userTable)
      .set({ emailVerified: false })
      .where(eq(schema.userTable.id, user.id));
    await db.insert(schema.deviceCodeTable).values({
      deviceCode: "test-device-grant",
      userCode: "TEST-CODE",
      userId: user.id,
      status: "approved",
      clientId: "kaneo-cli",
      expiresAt: new Date(Date.now() + 60_000),
    });
    const verifier = "synthetic-verifier";
    const code = await createAuthCode({
      clientId: "test-client",
      userId: user.id,
      redirectUri: "https://client.example/callback",
      codeChallenge: createHash("sha256").update(verifier).digest("base64url"),
    });
    const socket = { send: vi.fn(), close: vi.fn() };
    const connection = addUserConnection(
      user.id,
      socket as unknown as WSContext,
    );
    try {
      expect((await confirm(await requestLink(user.email))).status).toBe(200);
      expect(await db.select().from(schema.deviceCodeTable)).toHaveLength(0);
      expect(
        await exchangeCode(
          code,
          "test-client",
          verifier,
          "https://client.example/callback",
        ),
      ).toBeNull();
      expect(
        (
          await post("/device/token", {
            device_code: "test-device-grant",
            client_id: "kaneo-cli",
            grant_type: "urn:ietf:params:oauth:grant-type:device_code",
          })
        ).status,
      ).not.toBe(200);
      expect(socket.close).toHaveBeenCalledWith(1008, "User access revoked");
      expect(socket.send).toHaveBeenCalledWith(
        JSON.stringify({ type: "USER_ACCESS_REVOKED" }),
      );
    } finally {
      removeUserConnection(user.id, connection);
    }
  });

  it("approves a device code created before the first mailbox proof", async () => {
    const { user } = await createWorkspaceMember();
    await db
      .update(schema.userTable)
      .set({ emailVerified: false })
      .where(eq(schema.userTable.id, user.id));
    const created = await post("/device/code", { client_id: "kaneo-cli" });
    expect(created.status).toBe(200);
    const codes = await created.json();
    const signed = await confirm(await requestLink(user.email));
    expect(signed.status).toBe(200);
    const cookie = cookieFrom(signed);
    const claimed = await app.request(
      `/api/auth/device?user_code=${encodeURIComponent(codes.user_code)}`,
      { headers: { ...headers, Cookie: cookie } },
    );
    expect(claimed.status).toBe(200);
    expect(
      (await post("/device/approve", { userCode: codes.user_code }, cookie))
        .status,
    ).toBe(200);
    const exchanged = await post("/device/token", {
      device_code: codes.device_code,
      client_id: "kaneo-cli",
      grant_type: "urn:ietf:params:oauth:grant-type:device_code",
    });
    expect(exchanged.status).toBe(200);
    const token = (await exchanged.json()).access_token;
    expect(token).toBeTruthy();
    const session = await app.request("/api/auth/get-session", {
      headers: { ...headers, Authorization: `Bearer ${token}` },
    });
    expect((await session.json()).user.id).toBe(user.id);
  });

  it("rejects a consumed device grant when ownership changes before session insertion", async () => {
    const { user } = await createWorkspaceMember();
    await db.insert(schema.deviceCodeTable).values({
      deviceCode: "test-device-grant",
      userCode: "TEST-CODE",
      userId: user.id,
      createdAt: new Date(Date.now() - 1000),
      status: "approved",
      clientId: "kaneo-cli",
      expiresAt: new Date(Date.now() + 60_000),
    });
    const context = await auth.$context;
    const original = context.adapter.create.bind(context.adapter);
    let release!: () => void, reached!: () => void;
    const blocked = new Promise<void>((resolve) => {
      release = resolve;
    });
    const paused = new Promise<void>((resolve) => {
      reached = resolve;
    });
    vi.spyOn(context.adapter, "create").mockImplementation(async (args) => {
      if (args.model === "session") {
        reached();
        await blocked;
      }
      return original(args);
    });
    const pending = post("/device/token", {
      device_code: "test-device-grant",
      client_id: "kaneo-cli",
      grant_type: "urn:ietf:params:oauth:grant-type:device_code",
    });
    await paused;
    await context.adapter.update({
      model: "user",
      where: [{ field: "id", value: user.id }],
      update: { email: "replacement@example.com", emailVerified: false },
    });
    release();
    expect((await pending).status).not.toBe(200);
    expect(await db.select().from(schema.sessionTable)).toHaveLength(0);
  });
});
