import { APIError, getSessionFromCtx } from "better-auth/api";
import { eq } from "drizzle-orm";
import db, { schema } from "../database";

export function requirePasskeyUserVerification(userVerified: boolean) {
  if (!userVerified) {
    throw new APIError("FORBIDDEN", {
      code: "PASSKEY_USER_VERIFICATION_REQUIRED",
      message: "Unlock the authenticator with its PIN or biometrics.",
    });
  }
}

export async function requirePasskeyManagementSession(
  ctx: Parameters<typeof getSessionFromCtx>[0],
) {
  const session = await getSessionFromCtx(ctx);
  const [user] = session
    ? await db
        .select({ emailVerified: schema.userTable.emailVerified })
        .from(schema.userTable)
        .where(eq(schema.userTable.id, session.user.id))
    : [];
  if (!session || !user?.emailVerified) {
    throw new APIError("FORBIDDEN", {
      code: "EMAIL_VERIFICATION_REQUIRED",
      message: "Verify your email before managing passkeys.",
    });
  }
  if (Date.now() - new Date(session.session.createdAt).getTime() > 5 * 60_000) {
    throw new APIError("UNAUTHORIZED", {
      code: "FRESH_SESSION_REQUIRED",
      message: "Sign in again before managing passkeys.",
    });
  }
}
