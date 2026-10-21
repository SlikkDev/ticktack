import {
  assertPasswordProof,
  assertCredentialWrite,
  assertPasswordChangeSession,
} from "../auth/legacy-proof";
import type { AuthEndpointContext } from "@better-auth/core/context";
import { APIError } from "better-auth/api";
import { and, eq, gt, isNull, or } from "drizzle-orm";
import { assertMailboxProof } from "../auth/mailbox-proof";
import { assertDeviceGrant } from "../auth/device-grant-proof";
import db, { schema } from ".";

export type AuthTransaction = Parameters<
  Parameters<typeof db.transaction>[0]
>[0];

export async function lockAuthUser(tx: AuthTransaction, userId: string) {
  const [user] = await tx
    .select()
    .from(schema.userTable)
    .where(eq(schema.userTable.id, userId))
    .for("update");
  if (!user)
    throw new APIError("UNAUTHORIZED", {
      message: "Account no longer available",
    });
  return user;
}

export async function guardAuthInsert(
  tx: AuthTransaction,
  ctx: AuthEndpointContext,
  model: string,
  userId: string,
) {
  const user = await lockAuthUser(tx, userId);
  assertMailboxProof(ctx, user);
  if (["/magic-link/verify", "/sign-in/email-otp"].includes(ctx.path || ""))
    return;
  if (ctx.path === "/sign-in/email") {
    await assertPasswordProof(tx, ctx, user);
    return;
  }
  if (model === "session" && ctx.path === "/change-password") {
    await assertPasswordChangeSession(tx, ctx, user);
    return;
  }
  if (model === "credential") {
    await assertCredentialWrite(tx, ctx, user);
    return;
  }
  if (ctx.path === "/device/token") {
    assertDeviceGrant(ctx, user);
    return;
  }
  // Better Auth supports explicit server-only API-key issuance. HTTP calls
  // always carry a request/headers and must retain their live authorization.
  if (model === "apikey" && !ctx.request && !ctx.headers) return;
  if (model !== "apikey" && !user.emailVerified)
    throw new APIError("FORBIDDEN", { message: "Verify your email first" });
  if (ctx.path === "/passkey/verify-authentication") {
    const [credential] = await tx
      .select({ id: schema.passkeyTable.id })
      .from(schema.passkeyTable)
      .where(
        and(
          eq(
            schema.passkeyTable.credentialID,
            String(ctx.body?.response?.id || ""),
          ),
          eq(schema.passkeyTable.userId, userId),
        ),
      );
    if (!credential)
      throw new APIError("UNAUTHORIZED", {
        message: "Passkey no longer available",
      });
    return;
  }
  const sessionId = ctx.context.session?.session.id;
  const [session] = sessionId
    ? await tx
        .select()
        .from(schema.sessionTable)
        .where(
          and(
            eq(schema.sessionTable.id, sessionId),
            eq(schema.sessionTable.userId, userId),
            gt(schema.sessionTable.expiresAt, new Date()),
          ),
        )
    : [];
  if (
    !session &&
    model === "apikey" &&
    sessionId &&
    (ctx.headers?.has("x-api-key") || ctx.headers?.has("authorization"))
  ) {
    const [sourceKey] = await tx
      .select({ id: schema.apikeyTable.id })
      .from(schema.apikeyTable)
      .where(
        and(
          eq(schema.apikeyTable.id, sessionId),
          eq(schema.apikeyTable.referenceId, userId),
          eq(schema.apikeyTable.enabled, true),
          or(
            isNull(schema.apikeyTable.expiresAt),
            gt(schema.apikeyTable.expiresAt, new Date()),
          ),
        ),
      );
    if (sourceKey) return;
  }
  if (
    !session ||
    (model === "passkey" && Date.now() - session.createdAt.getTime() > 300_000)
  ) {
    throw new APIError("UNAUTHORIZED", {
      message: "Sign in again before continuing",
    });
  }
}
