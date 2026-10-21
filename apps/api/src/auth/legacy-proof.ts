import type { AuthEndpointContext } from "@better-auth/core/context";
import { APIError } from "better-auth/api";
import { and, eq, gt } from "drizzle-orm";
import { schema } from "../database";
import type { AuthTransaction } from "../database/auth-write-guard";

type Lookup = {
  id: string;
  email: string;
  credential?: { id: string; password: string };
};
const lookups = new WeakMap<AuthEndpointContext, Lookup>();
const resets = new WeakMap<
  AuthEndpointContext,
  { id: string; epoch: number | null }
>();
const passwordChanges = new WeakMap<
  AuthEndpointContext,
  { id: string; epoch: number | null; credentialId: string; password: string }
>();

export async function rememberPasswordChange(
  tx: AuthTransaction,
  ctx: AuthEndpointContext,
  user: { id: string; authRevokedAt: Date | null },
) {
  if (ctx.path !== "/change-password") return;
  const [credential] = await tx
    .select()
    .from(schema.accountTable)
    .where(
      and(
        eq(schema.accountTable.userId, user.id),
        eq(schema.accountTable.providerId, "credential"),
      ),
    );
  if (credential?.password)
    passwordChanges.set(ctx, {
      id: user.id,
      epoch: user.authRevokedAt?.getTime() ?? null,
      credentialId: credential.id,
      password: credential.password,
    });
}

export async function assertPasswordChangeSession(
  tx: AuthTransaction,
  ctx: AuthEndpointContext,
  user: { id: string; authRevokedAt: Date | null },
) {
  // The SDK intentionally deletes the original session before replacement.
  // Retain only the credential write authorized under the same user lock.
  const proof = passwordChanges.get(ctx);
  const [credential] =
    proof?.id === user.id &&
    proof.epoch === (user.authRevokedAt?.getTime() ?? null)
      ? await tx
          .select({ id: schema.accountTable.id })
          .from(schema.accountTable)
          .where(
            and(
              eq(schema.accountTable.id, proof.credentialId),
              eq(schema.accountTable.userId, user.id),
              eq(schema.accountTable.providerId, "credential"),
              eq(schema.accountTable.password, proof.password),
            ),
          )
      : [];
  if (!credential)
    throw new APIError("UNAUTHORIZED", {
      message: "Authorization expired. Start again.",
    });
}

export function rememberLegacyLookup(
  ctx: AuthEndpointContext | null,
  row: unknown,
) {
  if (
    !ctx ||
    !["/sign-in/email", "/request-password-reset"].includes(ctx.path || "") ||
    !row ||
    typeof row !== "object"
  )
    return;
  if (
    lookups.has(ctx) ||
    !("id" in row) ||
    !("email" in row) ||
    typeof row.id !== "string" ||
    typeof row.email !== "string"
  )
    return;
  const accounts =
    "account" in row && Array.isArray(row.account) ? row.account : [];
  const account = accounts.find(
    (a) => a.providerId === "credential" && typeof a.password === "string",
  );
  lookups.set(ctx, {
    id: row.id,
    email: row.email,
    credential: account
      ? { id: account.id, password: account.password }
      : undefined,
  });
}

export function assertLegacyMailbox(
  ctx: AuthEndpointContext,
  user: { id: string; email: string },
) {
  const proof = lookups.get(ctx);
  if (
    !proof ||
    proof.id !== user.id ||
    proof.email.toLowerCase() !== user.email.toLowerCase()
  )
    throw new APIError("UNAUTHORIZED", {
      message: "Account changed. Start again.",
    });
}

export async function assertPasswordProof(
  tx: AuthTransaction,
  ctx: AuthEndpointContext,
  user: { id: string; email: string },
) {
  assertLegacyMailbox(ctx, user);
  const proof = lookups.get(ctx)?.credential;
  const [account] = proof
    ? await tx
        .select({ id: schema.accountTable.id })
        .from(schema.accountTable)
        .where(
          and(
            eq(schema.accountTable.id, proof.id),
            eq(schema.accountTable.userId, user.id),
            eq(schema.accountTable.providerId, "credential"),
            eq(schema.accountTable.password, proof.password),
          ),
        )
    : [];
  if (!account)
    throw new APIError("UNAUTHORIZED", {
      message: "Credential no longer available",
    });
}

export function rememberResetProof(
  ctx: AuthEndpointContext | null,
  user: { id: string; authRevokedAt: Date | null },
) {
  if (ctx?.path === "/reset-password")
    resets.set(ctx, {
      id: user.id,
      epoch: user.authRevokedAt?.getTime() ?? null,
    });
}

export async function assertCredentialWrite(
  tx: AuthTransaction,
  ctx: AuthEndpointContext,
  user: { id: string; authRevokedAt: Date | null },
) {
  if (ctx.path === "/reset-password") {
    const proof = resets.get(ctx);
    if (
      proof?.id === user.id &&
      proof.epoch === (user.authRevokedAt?.getTime() ?? null)
    )
      return;
  } else {
    const actor = ctx.context.session;
    const [session] = actor
      ? await tx
          .select({ id: schema.sessionTable.id })
          .from(schema.sessionTable)
          .where(
            and(
              eq(schema.sessionTable.id, actor.session.id),
              eq(schema.sessionTable.userId, actor.user.id),
              gt(schema.sessionTable.expiresAt, new Date()),
            ),
          )
      : [];
    if (
      session &&
      (actor?.user.id === user.id || ctx.path === "/admin/set-user-password")
    )
      return;
  }
  throw new APIError("UNAUTHORIZED", {
    message: "Authorization expired. Start again.",
  });
}

export const isLegacyCredentialWrite = (path: string | undefined) =>
  [
    "/reset-password",
    "/set-password",
    "/change-password",
    "/admin/set-user-password",
  ].includes(path || "");
