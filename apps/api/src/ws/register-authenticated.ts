import { and, eq, gt, isNull, or } from "drizzle-orm";
import { isBanActive } from "../utils/user-ban";
import db, { schema } from "../database";
import { lockAuthUser } from "../database/auth-write-guard";

// Authentication precedes the HTTP upgrade. Recheck the original credential
// and register under the same user lock as ownership revocation, so an upgrade
// cannot register after the revocation broadcast using an obsolete identity.
export async function registerAuthenticatedConnection(
  userId: string,
  credential: { sessionId?: string; apiKeyId?: string },
  register: () => void,
) {
  return db.transaction(async (tx) => {
    const user = await lockAuthUser(tx, userId);
    if (isBanActive(user)) throw new Error("Account unavailable");
    const [valid] = credential.apiKeyId
      ? await tx
          .select({ id: schema.apikeyTable.id })
          .from(schema.apikeyTable)
          .where(
            and(
              eq(schema.apikeyTable.id, credential.apiKeyId),
              eq(schema.apikeyTable.referenceId, userId),
              eq(schema.apikeyTable.enabled, true),
              or(
                isNull(schema.apikeyTable.expiresAt),
                gt(schema.apikeyTable.expiresAt, new Date()),
              ),
            ),
          )
      : credential.sessionId
        ? await tx
            .select({ id: schema.sessionTable.id })
            .from(schema.sessionTable)
            .where(
              and(
                eq(schema.sessionTable.id, credential.sessionId),
                eq(schema.sessionTable.userId, userId),
                gt(schema.sessionTable.expiresAt, new Date()),
              ),
            )
        : [];
    if (!valid) throw new Error("Authorization expired");
    register();
  });
}
