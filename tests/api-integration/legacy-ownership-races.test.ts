import * as email from "@kaneo/email";
import { eq } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { auth } from "../../apps/api/src/auth";
import db, { schema } from "../../apps/api/src/database";
import { createApp } from "../../apps/api/src/index";
import { drainSignInEmails } from "../../apps/api/src/utils/sign-in-email-tasks";
import { resetTestDatabase } from "./helpers/database";

const address = "owner@example.com";
const password = "synthetic-password-for-test-only";
const nextPassword = "replacement-password-for-test-only";
const headers = {
  "Content-Type": "application/json",
  Origin: "http://localhost:5173",
};
const app = createApp().app;
async function post(path: string, body: unknown, cookie = "") {
  const response = await app.request(`/api/auth${path}`, {
    method: "POST",
    headers: { ...headers, Cookie: cookie },
    body: JSON.stringify(body),
  });
  await drainSignInEmails();
  return response;
}
const cookieFrom = (response: Response) =>
  response.headers
    .getSetCookie()
    .map((value) => value.split(";")[0])
    .join("; ");
async function signup() {
  const response = await post("/sign-up/email", {
    email: address,
    name: "Owner",
    password,
  });
  expect(response.status).toBe(200);
  return {
    user: (await response.json()).user as { id: string },
    cookie: cookieFrom(response),
  };
}
async function changeOwnership(id: string, verify = false) {
  await (
    await auth.$context
  ).adapter.update({
    model: "user",
    where: [{ field: "id", value: id }],
    update: verify
      ? { emailVerified: true }
      : { email: "replacement@example.com", emailVerified: false },
  });
}
function barrier() {
  let release!: () => void, reached!: () => void;
  const blocked = new Promise<void>((resolve) => {
    release = resolve;
  });
  const paused = new Promise<void>((resolve) => {
    reached = resolve;
  });
  return { release, reached, blocked, paused };
}
async function resetToken() {
  const send = vi.spyOn(email, "sendPasswordResetEmail").mockResolvedValue();
  expect(
    (
      await post("/request-password-reset", {
        email: address,
        redirectTo: "http://localhost:5173/auth/reset-password",
      })
    ).status,
  ).toBe(200);
  await vi.waitFor(() => expect(send).toHaveBeenCalled());
  const props = send.mock.lastCall?.[2] as { resetLink: string };
  return new URL(props.resetLink).pathname.split("/").at(-1)!;
}
async function otpCode() {
  const send = vi.spyOn(email, "sendOtpEmail").mockResolvedValue();
  expect(
    (
      await post("/email-otp/send-verification-otp", {
        email: address,
        type: "sign-in",
      })
    ).status,
  ).toBe(200);
  const props = send.mock.lastCall?.[2] as { otp: string } | undefined;
  expect(props?.otp).toBeTruthy();
  return props!.otp;
}
let testTime = Date.now();
beforeEach(async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  testTime += 61_000;
  vi.setSystemTime(testTime);
  await resetTestDatabase();
  vi.spyOn(email, "isSmtpConfigured").mockReturnValue(true);
});
afterAll(() => vi.useRealTimers());

describe("legacy authentication across mailbox ownership changes", () => {
  it.each([false, true])(
    "rejects password sign-in paused before session insertion when verification is %s",
    async (verify) => {
      const { user } = await signup();
      const adapter = (await auth.$context).adapter;
      const original = adapter.create.bind(adapter);
      const wait = barrier();
      vi.spyOn(adapter, "create").mockImplementation(async (args) => {
        if (args.model === "session") {
          wait.reached();
          await wait.blocked;
        }
        return original(args);
      });
      const pending = post("/sign-in/email", { email: address, password });
      try {
        await wait.paused;
        await changeOwnership(user.id, verify);
      } finally {
        wait.release();
      }
      expect((await pending).status).toBe(401);
      expect(await db.select().from(schema.sessionTable)).toHaveLength(0);
      expect(await db.select().from(schema.accountTable)).toHaveLength(0);
    },
  );

  it("revokes reset tokens issued to the previous mailbox", async () => {
    const { user } = await signup();
    const token = await resetToken();
    await changeOwnership(user.id);
    expect(await db.select().from(schema.verificationTable)).toHaveLength(0);
    expect(
      (await post("/reset-password", { token, newPassword: nextPassword }))
        .status,
    ).toBe(400);
    expect(await db.select().from(schema.accountTable)).toHaveLength(0);
  });

  it("rejects reset issuance paused after its old-mailbox lookup", async () => {
    const { user } = await signup();
    const adapter = (await auth.$context).adapter;
    const original = adapter.create.bind(adapter);
    const wait = barrier();
    vi.spyOn(adapter, "create").mockImplementation(async (args) => {
      if (args.model === "verification") {
        wait.reached();
        await wait.blocked;
      }
      return original(args);
    });
    const send = vi.spyOn(email, "sendPasswordResetEmail").mockResolvedValue();
    const pending = post("/request-password-reset", { email: address });
    try {
      await wait.paused;
      await changeOwnership(user.id);
    } finally {
      wait.release();
    }
    expect((await pending).status).toBe(401);
    expect(send).not.toHaveBeenCalled();
    expect(await db.select().from(schema.verificationTable)).toHaveLength(0);
  });

  it("rejects a reset consumed before an ownership change but completed afterward", async () => {
    const { user } = await signup();
    const token = await resetToken();
    const adapter = (await auth.$context).adapter;
    const original = adapter.consumeOne!.bind(adapter);
    const wait = barrier();
    vi.spyOn(adapter, "consumeOne").mockImplementation(async (args) => {
      const result = await original(args);
      if (args.model === "verification") {
        wait.reached();
        await wait.blocked;
      }
      return result;
    });
    const pending = post("/reset-password", {
      token,
      newPassword: nextPassword,
    });
    try {
      await wait.paused;
      await changeOwnership(user.id);
    } finally {
      wait.release();
    }
    expect((await pending).status).toBe(401);
    expect(await db.select().from(schema.accountTable)).toHaveLength(0);
  });

  it("rejects OTP sign-in paused after lookup of the previous mailbox", async () => {
    const { user } = await signup();
    const otp = await otpCode();
    const adapter = (await auth.$context).adapter;
    const original = adapter.findOne.bind(adapter);
    const wait = barrier();
    let once = true;
    vi.spyOn(adapter, "findOne").mockImplementation(async (args) => {
      const result = await original(args);
      if (
        once &&
        args.model === "user" &&
        args.where.some((clause) => clause.field === "email")
      ) {
        once = false;
        wait.reached();
        await wait.blocked;
      }
      return result;
    });
    const pending = post("/sign-in/email-otp", { email: address, otp });
    try {
      await wait.paused;
      await changeOwnership(user.id);
    } finally {
      wait.release();
    }
    expect((await pending).status).toBe(403);
    const [updated] = await db
      .select()
      .from(schema.userTable)
      .where(eq(schema.userTable.id, user.id));
    expect(updated.emailVerified).toBe(false);
    expect(await db.select().from(schema.sessionTable)).toHaveLength(0);
  });

  it.each([false, true])(
    "rejects a late reset update when a replacement credential exists: %s",
    async (replacement) => {
      const { user } = await signup();
      const token = await resetToken();
      const adapter = (await auth.$context).adapter;
      const original = adapter.updateMany.bind(adapter);
      const wait = barrier();
      vi.spyOn(adapter, "updateMany").mockImplementation(async (args) => {
        if (args.model === "account") {
          wait.reached();
          await wait.blocked;
        }
        return original(args);
      });
      const pending = post("/reset-password", {
        token,
        newPassword: nextPassword,
      });
      try {
        await wait.paused;
        await changeOwnership(user.id);
        if (replacement)
          await db.insert(schema.accountTable).values({
            userId: user.id,
            accountId: user.id,
            providerId: "credential",
            password: "new-owner-synthetic-hash",
          });
      } finally {
        wait.release();
      }
      expect((await pending).status).toBe(401);
      const accounts = await db.select().from(schema.accountTable);
      expect(accounts).toHaveLength(replacement ? 1 : 0);
      if (replacement)
        expect(accounts[0].password).toBe("new-owner-synthetic-hash");
    },
  );

  it.each(["write", "session"])(
    "rejects a password change interrupted before %s",
    async (stage) => {
      const { user, cookie } = await signup();
      const adapter = (await auth.$context).adapter;
      const wait = barrier();
      if (stage === "write") {
        const original = adapter.update.bind(adapter);
        vi.spyOn(adapter, "update").mockImplementation(async (args) => {
          if (args.model === "account") {
            wait.reached();
            await wait.blocked;
          }
          return original(args);
        });
      } else {
        const original = adapter.create.bind(adapter);
        vi.spyOn(adapter, "create").mockImplementation(async (args) => {
          if (args.model === "session") {
            wait.reached();
            await wait.blocked;
          }
          return original(args);
        });
      }
      const pending = post(
        "/change-password",
        {
          currentPassword: password,
          newPassword: nextPassword,
          revokeOtherSessions: true,
        },
        cookie,
      );
      try {
        await wait.paused;
        await changeOwnership(user.id);
      } finally {
        wait.release();
      }
      expect((await pending).status).toBe(401);
      expect(await db.select().from(schema.accountTable)).toHaveLength(0);
      expect(await db.select().from(schema.sessionTable)).toHaveLength(0);
    },
  );

  it("preserves ordinary password login and password changes with a live session", async () => {
    const { cookie } = await signup();
    expect(
      (await post("/sign-in/email", { email: address, password })).status,
    ).toBe(200);
    expect(
      (
        await post(
          "/change-password",
          {
            currentPassword: password,
            newPassword: nextPassword,
            revokeOtherSessions: true,
          },
          cookie,
        )
      ).status,
    ).toBe(200);
    expect(
      (await post("/sign-in/email", { email: address, password: nextPassword }))
        .status,
    ).toBe(200);
    expect(
      (await post("/sign-in/email", { email: address, password })).status,
    ).toBe(401);
  });

  it("preserves ordinary OTP verification while revoking old password access", async () => {
    await signup();
    const otp = await otpCode();
    expect(
      (await post("/sign-in/email-otp", { email: address, otp })).status,
    ).toBe(200);
    expect(await db.select().from(schema.accountTable)).toHaveLength(0);
    expect(await db.select().from(schema.sessionTable)).toHaveLength(1);
  });
});
