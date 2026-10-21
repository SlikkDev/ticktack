import {
  rememberLegacyLookup,
  assertLegacyMailbox,
  rememberResetProof,
  isLegacyCredentialWrite,
  assertCredentialWrite,
  rememberPasswordChange,
} from "../auth/legacy-proof";
import type { BetterAuthOptions } from "better-auth";
import { getCurrentAuthContext } from "@better-auth/core/context";
import type { DBAdapter } from "better-auth/adapters";
import {
  type DrizzleAdapterConfig,
  drizzleAdapter,
} from "better-auth/adapters/drizzle";
import { APIError } from "better-auth/api";
import { and, count, eq, or, sql } from "drizzle-orm";
import {
  assertMailboxProof,
  rememberMailboxProof,
} from "../auth/mailbox-proof";
import { rememberDeviceGrant } from "../auth/device-grant-proof";
import { guardAuthInsert, lockAuthUser } from "./auth-write-guard";
import { revokeUserConnections } from "../ws";
import {
  hasInstanceAdminRole,
  instanceAdminRoleSql,
} from "../utils/instance-admin-role";
import db, { schema } from ".";

export function authDatabaseAdapter(
  config: Omit<DrizzleAdapterConfig, "transaction">,
) {
  return (options: BetterAuthOptions): DBAdapter => {
    const adapter = drizzleAdapter(db, config)(options);
    const guardedAdapter: DBAdapter = {
      ...adapter,
      // The underlying adapter's default transaction is an as-is callback.
      // Keep SDK transaction scopes on this wrapper; auth writes below provide
      // their own real PostgreSQL transactions and ownership locks.
      transaction: async (callback) => callback(guardedAdapter),
      async consumeOne<T>(
        data: Parameters<NonNullable<DBAdapter["consumeOne"]>>[0],
      ) {
        if (!adapter.consumeOne)
          throw new Error("Atomic credential consumption is required");
        const ctx = await getCurrentAuthContext().catch(() => null);
        if (data.model === "verification" && ctx?.path === "/reset-password") {
          const found = await adapter.findOne<{ value: string }>({
            model: data.model,
            where: data.where,
          });
          if (!found?.value) return adapter.consumeOne<T>(data);
          return db.transaction(async (tx) => {
            const user = await lockAuthUser(tx, found.value);
            const transactionAdapter = drizzleAdapter(tx, config)(options);
            if (!transactionAdapter.consumeOne)
              throw new Error("Atomic reset consumption is required");
            const result = await transactionAdapter.consumeOne<T>(data);
            if (result) rememberResetProof(ctx, user);
            return result;
          });
        }
        if (data.model !== "deviceCode") return adapter.consumeOne<T>(data);
        const found = await adapter.findOne<{ userId?: string }>({
          model: data.model,
          where: data.where,
        });
        if (!found?.userId) return adapter.consumeOne<T>(data);
        return db.transaction(async (tx) => {
          const user = await lockAuthUser(tx, found.userId!);
          const transactionAdapter = drizzleAdapter(tx, config)(options);
          if (!transactionAdapter.consumeOne)
            throw new Error("Atomic credential consumption is required");
          const result = await transactionAdapter.consumeOne<T>(data);
          if (
            result &&
            typeof result === "object" &&
            "userId" in result &&
            result.userId === user.id
          )
            rememberDeviceGrant(ctx, user);
          return result;
        });
      },
      async findOne<T>(data: Parameters<DBAdapter["findOne"]>[0]) {
        const result = await adapter.findOne<T>(data);
        if (data.model === "user")
          rememberLegacyLookup(
            await getCurrentAuthContext().catch(() => null),
            result,
          );
        if (
          data.model === "user" &&
          data.where.some((where) => where.field === "email")
        ) {
          rememberMailboxProof(
            await getCurrentAuthContext().catch(() => null),
            result,
          );
        }
        return result;
      },
      async create<T extends Record<string, unknown>, R = T>(data: {
        model: string;
        data: Omit<T, "id">;
        select?: string[];
        forceAllowId?: boolean;
      }) {
        const ctx = await getCurrentAuthContext().catch(() => null);
        if (
          ctx?.path === "/request-password-reset" &&
          data.model === "verification" &&
          String(data.data.identifier).startsWith("reset-password:")
        ) {
          return db.transaction(async (tx) => {
            const user = await lockAuthUser(tx, String(data.data.value));
            assertLegacyMailbox(ctx, user);
            return drizzleAdapter(tx, config)(options).create<T, R>(data);
          });
        }
        const credentialWrite =
          ctx &&
          data.model === "account" &&
          data.data.providerId === "credential" &&
          isLegacyCredentialWrite(ctx.path);
        const protectedInsert =
          ctx &&
          (credentialWrite ||
            data.model === "passkey" ||
            (data.model === "session" &&
              [
                "/magic-link/verify",
                "/sign-in/email-otp",
                "/sign-in/email",
                "/change-password",
                "/passkey/verify-authentication",
                "/device/token",
              ].includes(ctx.path || "")) ||
            (data.model === "apikey" && ctx.path === "/api-key/create"));
        const result = protectedInsert
          ? await db.transaction(async (tx) => {
              const userId = String(
                data.data.userId || data.data.referenceId || "",
              );
              await guardAuthInsert(
                tx,
                ctx,
                credentialWrite ? "credential" : data.model,
                userId,
              );
              return drizzleAdapter(tx, config)(options).create<T, R>(data);
            })
          : await adapter.create<T, R>(data);
        if (data.model === "user") rememberMailboxProof(ctx, result);
        return result;
      },
      async updateMany(data: Parameters<DBAdapter["updateMany"]>[0]) {
        const ctx = await getCurrentAuthContext().catch(() => null);
        if (
          data.model !== "account" ||
          !ctx ||
          !isLegacyCredentialWrite(ctx.path)
        )
          return adapter.updateMany(data);
        return db.transaction(async (tx) => {
          const transactionAdapter = drizzleAdapter(tx, config)(options);
          const rows = await transactionAdapter.findMany<{ userId: string }>({
            model: data.model,
            where: data.where,
          });
          if (!rows.length)
            throw new APIError("UNAUTHORIZED", {
              message: "Credential no longer available",
            });
          const users = [];
          for (const id of [...new Set(rows.map((row) => row.userId))].sort()) {
            const user = await lockAuthUser(tx, id);
            await assertCredentialWrite(tx, ctx, user);
            users.push(user);
          }
          const result = await transactionAdapter.updateMany(data);
          for (const user of users) await rememberPasswordChange(tx, ctx, user);
          return result;
        });
      },
      async update<T>(data: Parameters<DBAdapter["update"]>[0]) {
        const ctx = await getCurrentAuthContext().catch(() => null);
        if (
          data.model === "account" &&
          ctx &&
          isLegacyCredentialWrite(ctx.path)
        ) {
          return db.transaction(async (tx) => {
            const transactionAdapter = drizzleAdapter(tx, config)(options);
            const account = await transactionAdapter.findOne<{
              userId: string;
            }>({ model: data.model, where: data.where });
            const user = account
              ? await lockAuthUser(tx, account.userId)
              : null;
            if (!user)
              throw new APIError("UNAUTHORIZED", {
                message: "Credential no longer available",
              });
            await assertCredentialWrite(tx, ctx, user);
            const result = await transactionAdapter.update<T>(data);
            await rememberPasswordChange(tx, ctx, user);
            return result;
          });
        }
        if (
          data.model === "deviceCode" &&
          ctx &&
          ["/device", "/device/approve"].includes(ctx.path || "")
        ) {
          return db.transaction(async (tx) => {
            const userId = ctx.context.session?.user.id;
            if (!userId)
              throw new APIError("UNAUTHORIZED", { message: "Sign in again" });
            await guardAuthInsert(tx, ctx, "apikey", userId);
            return drizzleAdapter(tx, config)(options).update<T>(data);
          });
        }
        const removesAdmin =
          Object.hasOwn(data.update, "role") &&
          !hasInstanceAdminRole(data.update.role);
        const changesEmail = Object.hasOwn(data.update, "email");
        const verifiesEmail = data.update.emailVerified === true;
        if (
          data.model !== "user" ||
          (!removesAdmin && !changesEmail && !verifiesEmail)
        ) {
          return adapter.update<T>(data);
        }

        let revokedUserId: string | undefined;
        const updated = await db.transaction(async (tx) => {
          // Serialize role removals across API instances, keeping the count
          // and write in the same transaction so cross-demotions cannot race.
          await tx.execute(sql`SELECT pg_advisory_xact_lock(2026, 1732)`);
          const transactionAdapter = drizzleAdapter(tx, config)(options);
          const found = await transactionAdapter.findOne<{
            id: string;
            email: string;
            role?: string;
          }>({
            model: data.model,
            where: data.where,
          });
          const user = found ? await lockAuthUser(tx, found.id) : null;
          if (user) assertMailboxProof(ctx, user);

          if (removesAdmin && hasInstanceAdminRole(user?.role)) {
            const [admins] = await tx
              .select({ value: count() })
              .from(schema.userTable)
              .where(instanceAdminRoleSql(schema.userTable.role));
            if ((admins?.value ?? 0) <= 1) {
              throw new APIError("BAD_REQUEST", {
                code: "CANNOT_REMOVE_LAST_ADMIN",
                message: "The instance must have at least one administrator.",
              });
            }
          }

          if (
            user &&
            ((changesEmail &&
              String(data.update.email).trim().toLowerCase() !==
                user.email.trim().toLowerCase()) ||
              (verifiesEmail && !user.emailVerified))
          ) {
            // Email ownership changed: old devices and sessions must not retain
            // access after the new mailbox proves ownership.
            await tx
              .delete(schema.accountTable)
              .where(
                and(
                  eq(schema.accountTable.userId, user.id),
                  eq(schema.accountTable.providerId, "credential"),
                ),
              );
            await tx
              .delete(schema.verificationTable)
              .where(
                and(
                  eq(schema.verificationTable.value, user.id),
                  sql`${schema.verificationTable.identifier} LIKE 'reset-password:%'`,
                ),
              );
            await tx
              .delete(schema.passkeyTable)
              .where(eq(schema.passkeyTable.userId, user.id));
            await tx
              .delete(schema.sessionTable)
              .where(eq(schema.sessionTable.userId, user.id));
            await tx
              .delete(schema.apikeyTable)
              .where(
                or(
                  eq(schema.apikeyTable.referenceId, user.id),
                  eq(schema.apikeyTable.userId, user.id),
                ),
              );
            await tx
              .delete(schema.deviceCodeTable)
              .where(eq(schema.deviceCodeTable.userId, user.id));
            await tx
              .delete(schema.mcpOauthStateTable)
              .where(
                and(
                  eq(schema.mcpOauthStateTable.kind, "code"),
                  sql`${schema.mcpOauthStateTable.payload}->>'userId' = ${user.id}`,
                ),
              );
            await tx
              .update(schema.userTable)
              .set({ authRevokedAt: new Date() })
              .where(eq(schema.userTable.id, user.id));
            revokedUserId = user.id;
          }
          return transactionAdapter.update<T>(data);
        });
        if (revokedUserId) await revokeUserConnections(revokedUserId);
        return updated;
      },
    };
    return guardedAdapter;
  };
}
