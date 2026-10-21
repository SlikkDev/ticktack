// Capture once before telemetry or the router can observe a sign-in token.
// Keep it only in this page's memory; a reload requires a fresh email link.
let link: { token: string; destination: string } | null = null;
if (
  typeof window !== "undefined" &&
  window.location.pathname.replace(/\/$/, "") === "/auth/magic-link"
) {
  const params = new URLSearchParams(window.location.hash.slice(1));
  link = {
    token: params.get("token") || "",
    destination: params.get("destination") || "/dashboard",
  };
  window.history.replaceState(
    window.history.state,
    "",
    window.location.pathname,
  );
}
export function readMagicLinkFragment() {
  return link;
}
export function clearMagicLinkFragment() {
  link = null;
}
