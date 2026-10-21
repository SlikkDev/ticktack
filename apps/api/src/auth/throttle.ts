import { createHmac } from "node:crypto";
import { APIError } from "better-auth/api";
import { sql } from "drizzle-orm";
import db from "../database";
import { resolveAuthSecret } from "../utils/auth-secret";

export async function consumeAuthLimit(
  kind: string,
  identity: string,
  max: number,
  seconds: number,
) {
  const now = Date.now();
  const window = Math.floor(now / (seconds * 1000));
  const key = createHmac("sha256", resolveAuthSecret())
    .update(`${kind}:${window}:${identity}`)
    .digest("hex");
  const expiresAt = new Date((window + 1) * seconds * 1000);
  const result = await db.execute<{ count: number }>(sql`
    INSERT INTO auth_throttle (key, count, expires_at) VALUES (${key}, 1, ${expiresAt})
    ON CONFLICT (key) DO UPDATE SET count = LEAST(auth_throttle.count + 1, ${max + 1})
    RETURNING count
  `);
  await db.execute(sql`DELETE FROM auth_throttle WHERE key IN
    (SELECT key FROM auth_throttle WHERE expires_at < ${new Date(now)} LIMIT 100)`);
  if (!result.rows[0] || result.rows[0].count > max) {
    throw new APIError("TOO_MANY_REQUESTS", {
      code: "TOO_MANY_REQUESTS",
      message: "Too many attempts. Please wait before trying again.",
    });
  }
}
