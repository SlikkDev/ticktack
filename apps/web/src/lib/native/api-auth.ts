import { getSessionToken, setSessionToken } from "./session-token";

// Mirrors apps/api/src/ws/bearer-protocol.ts.
const WEBSOCKET_BEARER_PROTOCOL_PREFIX = "kaneo.bearer.";
const SIGN_OUT_PATH = "/api/auth/sign-out";

function resolveRequestUrl(input: RequestInfo | URL): URL {
  const raw =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.href
        : input.url;
  return new URL(raw, window.location.href);
}

function encodeBase64Url(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * Native shells run the app from capacitor://localhost (iOS) or
 * https://localhost (Android), so the API's session cookie is a third-party
 * cookie that the WebView withholds. Instead, every request to the API origin
 * carries the session token that Better Auth's bearer plugin issues, and any
 * response that issues a token (sign-in, session refresh) replaces the stored
 * one. Requests to other origins, such as presigned S3 uploads, are untouched.
 */
export function createAuthenticatedFetch(
  apiOrigin: string,
  baseFetch: typeof fetch,
): typeof fetch {
  return async (input, init) => {
    const url = resolveRequestUrl(input);
    if (url.origin !== apiOrigin) {
      return baseFetch(input, init);
    }

    const headers = new Headers(
      init?.headers ?? (input instanceof Request ? input.headers : undefined),
    );
    const token = getSessionToken();
    if (token && !headers.has("authorization")) {
      headers.set("authorization", `Bearer ${token}`);
    }

    const response = await baseFetch(input, { ...init, headers });
    const issued = response.headers.get("set-auth-token");
    if (issued) {
      void setSessionToken(issued);
    } else if (response.ok && url.pathname === SIGN_OUT_PATH) {
      void setSessionToken(null);
    }
    return response;
  };
}

export function installNativeApiAuth(apiOrigin: string): void {
  globalThis.fetch = createAuthenticatedFetch(
    apiOrigin,
    globalThis.fetch.bind(globalThis),
  );
}

/**
 * Browsers cannot add headers to a WebSocket upgrade, so the shell offers the
 * token as a subprotocol that the API reads instead of the session cookie.
 */
export function getWebSocketBearerProtocols(): string[] | undefined {
  const token = getSessionToken();
  return token
    ? [`${WEBSOCKET_BEARER_PROTOCOL_PREFIX}${encodeBase64Url(token)}`]
    : undefined;
}
