// Mirrors apps/web/src/lib/native/api-auth.ts.
const WEBSOCKET_BEARER_PROTOCOL_PREFIX = "kaneo.bearer.";
const ENCODED_TOKEN_PATTERN = /^[A-Za-z0-9_-]+$/;

export type WebSocketBearerToken = {
  token: string | null;
  malformed: boolean;
};

/**
 * Browsers cannot attach an Authorization header to a WebSocket upgrade, so
 * the native shells offer the session token as the subprotocol
 * `kaneo.bearer.<base64url(token)>` instead of relying on a cookie. Only
 * upgrade requests are inspected; ordinary requests keep using headers.
 */
export function readWebSocketBearerToken(
  headers: Headers,
): WebSocketBearerToken {
  const none = { token: null, malformed: false };
  if (headers.get("upgrade")?.toLowerCase() !== "websocket") return none;
  const offered = headers.get("sec-websocket-protocol");
  if (!offered) return none;

  const protocol = offered
    .split(",")
    .map((value) => value.trim())
    .find((value) => value.startsWith(WEBSOCKET_BEARER_PROTOCOL_PREFIX));
  if (!protocol) return none;

  const encoded = protocol.slice(WEBSOCKET_BEARER_PROTOCOL_PREFIX.length);
  if (!ENCODED_TOKEN_PATTERN.test(encoded)) {
    return { token: null, malformed: true };
  }
  const token = Buffer.from(encoded, "base64url").toString("utf8");
  if (!token || /\s/.test(token)) {
    return { token: null, malformed: true };
  }
  return { token, malformed: false };
}
