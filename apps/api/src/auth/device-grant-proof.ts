import type { AuthEndpointContext } from "@better-auth/core/context";
import { APIError } from "better-auth/api";

const grants = new WeakMap<
  AuthEndpointContext,
  { userId: string; revokedAt: number | null }
>();
export function rememberDeviceGrant(
  ctx: AuthEndpointContext | null,
  user: { id: string; authRevokedAt: Date | null },
) {
  if (ctx?.path !== "/device/token") return;
  grants.set(ctx, {
    userId: user.id,
    revokedAt: user.authRevokedAt?.getTime() ?? null,
  });
}
export function assertDeviceGrant(
  ctx: AuthEndpointContext,
  user: { id: string; authRevokedAt: Date | null },
) {
  const grant = grants.get(ctx);
  if (
    !grant ||
    grant.userId !== user.id ||
    grant.revokedAt !== (user.authRevokedAt?.getTime() ?? null)
  ) {
    throw new APIError("UNAUTHORIZED", {
      message: "Device authorization was revoked",
    });
  }
}
