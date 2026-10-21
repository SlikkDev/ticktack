type Env = Record<string, string | undefined>;

export function isPasswordlessAuth(env: Env = process.env) {
  return env.AUTH_MODE === "passwordless";
}

export function getPasswordlessConfig(env: Env = process.env) {
  if (env.AUTH_MODE && !["legacy", "passwordless"].includes(env.AUTH_MODE)) {
    throw new Error("AUTH_MODE must be legacy or passwordless");
  }
  const passwordless = isPasswordlessAuth(env);
  const passkeys = passwordless || env.ENABLE_PASSKEYS === "true";
  if (
    passwordless &&
    (env.DISABLE_REGISTRATION !== "true" ||
      env.DISABLE_GUEST_ACCESS !== "true" ||
      env.DISABLE_LOGIN_FORM === "true" ||
      !env.SMTP_HOST ||
      !env.SMTP_FROM)
  ) {
    throw new Error(
      "Passwordless mode requires SMTP, closed public registration, disabled guest access and an enabled local login form",
    );
  }
  if (!passkeys) return { passwordless, passkeys, rpID: "", origin: "" };
  const url = new URL(env.KANEO_CLIENT_URL || "http://localhost:5173");
  const rpID = env.PASSKEY_RP_ID?.trim().toLowerCase();
  if (
    !rpID ||
    rpID !== url.hostname ||
    (url.protocol !== "https:" &&
      !(url.protocol === "http:" && url.hostname === "localhost"))
  ) {
    throw new Error(
      "Passkeys require an explicit PASSKEY_RP_ID matching the client hostname and HTTPS (localhost development is allowed)",
    );
  }
  return { passwordless, passkeys, rpID, origin: url.origin };
}

export function isPasswordlessBlockedPath(path: string) {
  return (
    [
      "/sign-in/email",
      "/sign-up/email",
      "/request-password-reset",
      "/reset-password",
      "/change-password",
      "/set-password",
      "/admin/set-user-password",
      "/sign-in/email-otp",
      "/sign-in/anonymous",
      "/sign-in/social",
      "/sign-in/oauth2",
      "/link-social",
      "/oauth2/link",
    ].includes(path) ||
    ["/email-otp/", "/reset-password/", "/callback/", "/oauth2/callback/"].some(
      (prefix) => path.startsWith(prefix),
    )
  );
}
