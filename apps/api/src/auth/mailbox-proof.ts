import type { AuthEndpointContext } from "@better-auth/core/context";
import { APIError } from "better-auth/api";

type MailboxProof = { id: string; email: string };
const proofs = new WeakMap<AuthEndpointContext, MailboxProof>();

export function rememberMailboxProof(
  ctx: AuthEndpointContext | null,
  user: unknown,
) {
  if (ctx?.path !== "/magic-link/verify" || !user || typeof user !== "object")
    return;
  if (
    "id" in user &&
    "email" in user &&
    typeof user.id === "string" &&
    typeof user.email === "string"
  ) {
    // Keep the mailbox resolved from the consumed token, never a later lookup by ID.
    if (!proofs.has(ctx)) proofs.set(ctx, { id: user.id, email: user.email });
  }
}

export function assertMailboxProof(
  ctx: AuthEndpointContext | null,
  user: MailboxProof,
) {
  if (ctx?.path !== "/magic-link/verify") return;
  const proof = proofs.get(ctx);
  if (
    !proof ||
    proof.id !== user.id ||
    proof.email.toLowerCase() !== user.email.toLowerCase()
  ) {
    throw new APIError("FORBIDDEN", {
      code: "MAILBOX_CHANGED",
      message: "The account changed. Request a new sign-in link.",
    });
  }
}
