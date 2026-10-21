export function interactiveMagicLink(url: string, clientUrl: string) {
  const source = new URL(url);
  const token = source.searchParams.get("token");
  if (!token) throw new Error("Magic-link token is missing");
  const target = new URL("/auth/magic-link", clientUrl);
  const callback = new URL(
    source.searchParams.get("callbackURL") || "/dashboard",
    clientUrl,
  );
  const destination =
    callback.origin === target.origin && !callback.pathname.startsWith("//")
      ? `${callback.pathname}${callback.search}`
      : "/dashboard";
  // Fragments stay out of proxy logs and HTTP referrers. A button explicitly
  // redeems the token through the same-origin POST confirmation endpoint.
  target.hash = new URLSearchParams({ token, destination }).toString();
  return target.toString();
}
