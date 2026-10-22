import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vite-plus/test";

const { stored } = vi.hoisted(() => ({ stored: new Map<string, string>() }));

vi.mock("@capacitor/preferences", () => ({
  Preferences: {
    get: async ({ key }: { key: string }) => ({
      value: stored.get(key) ?? null,
    }),
    set: async ({ key, value }: { key: string; value: string }) => {
      stored.set(key, value);
    },
    remove: async ({ key }: { key: string }) => {
      stored.delete(key);
    },
  },
}));

import {
  createAuthenticatedFetch,
  getWebSocketBearerProtocols,
} from "./api-auth";
import { loadSessionToken, setSessionToken } from "./session-token";

const API_ORIGIN = "https://tasks.example.test";

function respond(headers: Record<string, string> = {}, status = 200) {
  return new Response(null, { status, headers });
}

describe("native API authentication", () => {
  const baseFetch = vi.fn<typeof fetch>();

  beforeEach(async () => {
    stored.clear();
    baseFetch.mockReset();
    baseFetch.mockResolvedValue(respond());
    await setSessionToken(null);
  });

  afterEach(async () => {
    await setSessionToken(null);
  });

  it("restores the persisted token and sends it only to the API origin", async () => {
    stored.set("kaneo.session-token", "stored-token");
    expect(await loadSessionToken()).toBe("stored-token");

    const authenticatedFetch = createAuthenticatedFetch(API_ORIGIN, baseFetch);
    await authenticatedFetch(`${API_ORIGIN}/api/user`, {
      credentials: "include",
    });
    await authenticatedFetch(
      new Request(`${API_ORIGIN}/api/task`, {
        headers: { "x-kaneo-window-id": "w1" },
      }),
    );
    await authenticatedFetch("https://uploads.example.test/object", {
      method: "PUT",
    });

    const [first, second, third] = baseFetch.mock.calls;
    expect(new Headers(first?.[1]?.headers).get("authorization")).toBe(
      "Bearer stored-token",
    );
    expect(first?.[1]?.credentials).toBe("include");
    expect(new Headers(second?.[1]?.headers).get("authorization")).toBe(
      "Bearer stored-token",
    );
    expect(new Headers(second?.[1]?.headers).get("x-kaneo-window-id")).toBe(
      "w1",
    );
    expect(third?.[1]).toEqual({ method: "PUT" });
  });

  it("leaves an explicit Authorization header alone", async () => {
    await setSessionToken("stored-token");
    const authenticatedFetch = createAuthenticatedFetch(API_ORIGIN, baseFetch);
    await authenticatedFetch(`${API_ORIGIN}/api/user`, {
      headers: { authorization: "Bearer api-key" },
    });
    expect(
      new Headers(baseFetch.mock.calls[0]?.[1]?.headers).get("authorization"),
    ).toBe("Bearer api-key");
  });

  it("stores issued tokens and forgets them after signing out", async () => {
    const authenticatedFetch = createAuthenticatedFetch(API_ORIGIN, baseFetch);
    baseFetch.mockResolvedValueOnce(
      respond({ "set-auth-token": "issued-token" }),
    );
    await authenticatedFetch(`${API_ORIGIN}/api/auth/sign-in/email`, {
      method: "POST",
    });
    await vi.waitFor(() =>
      expect(stored.get("kaneo.session-token")).toBe("issued-token"),
    );
    expect(getWebSocketBearerProtocols()).toEqual([
      `kaneo.bearer.${btoa("issued-token")}`,
    ]);

    baseFetch.mockResolvedValueOnce(respond({}, 500));
    await authenticatedFetch(`${API_ORIGIN}/api/auth/sign-out`, {
      method: "POST",
    });
    expect(stored.get("kaneo.session-token")).toBe("issued-token");

    await authenticatedFetch(`${API_ORIGIN}/api/auth/sign-out`, {
      method: "POST",
    });
    await vi.waitFor(() =>
      expect(stored.has("kaneo.session-token")).toBe(false),
    );
    expect(getWebSocketBearerProtocols()).toBeUndefined();
  });

  it("encodes the WebSocket subprotocol as unpadded base64url", async () => {
    await setSessionToken("ab?c~.sig");
    expect(getWebSocketBearerProtocols()).toEqual([
      `kaneo.bearer.${btoa("ab?c~.sig").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")}`,
    ]);
    expect(getWebSocketBearerProtocols()?.[0]).toMatch(
      /^kaneo\.bearer\.[A-Za-z0-9_-]+$/,
    );
  });
});
