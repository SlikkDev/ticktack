import { createFileRoute, redirect } from "@tanstack/react-router";
import { authClient } from "@/lib/auth-client";
import { getConfig } from "@/fetchers/config/get-config";

export const Route = createFileRoute("/auth")({
  beforeLoad: async ({ location }) => {
    let session = null;
    try {
      const { data } = await authClient.getSession();
      session = data;
    } catch (error) {
      if (import.meta.env.DEV) console.warn("getSession failed", error);
      // getSession() rejected (e.g. network error) — treat as unauthenticated, allow auth pages to render
    }
    const isPasswordRecovery = [
      "/auth/forgot-password",
      "/auth/reset-password",
      "/auth/magic-link",
    ].includes(location.pathname.replace(/\/$/, ""));
    const reauthentication =
      location.pathname.replace(/\/$/, "") === "/auth/sign-in" &&
      new URLSearchParams(location.searchStr).get("reauth") === "true";
    if (
      ["/auth/forgot-password", "/auth/reset-password"].includes(
        location.pathname.replace(/\/$/, ""),
      ) &&
      (await getConfig()).passwordlessAuth
    ) {
      throw redirect({ to: "/auth/sign-in", search: { reauth: "true" } });
    }
    if (session && !isPasswordRecovery && !reauthentication) {
      throw redirect({
        to: "/dashboard",
      });
    }
    return { session };
  },
});
