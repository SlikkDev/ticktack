import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

const { state } = vi.hoisted(() => ({
  state: { sessionLookups: [] as Headers[] },
}));

vi.mock("../../../apps/api/src/utils/get-user-session", () => ({
  getUserSession: async (headers: Headers) => {
    state.sessionLookups.push(headers);
    const authorization = headers.get("authorization");
    const cookie = headers.get("cookie") ?? "";
    if (authorization === "Bearer bearer-session-token") {
      return {
        user: { id: "user-bearer", email: "bearer@example.test" },
        session: { id: "session-bearer" },
      };
    }
    if (!authorization && cookie.includes("session_token=cookie-token")) {
      return {
        user: { id: "user-cookie", email: "cookie@example.test" },
        session: { id: "session-cookie" },
      };
    }
    return null;
  },
}));

vi.mock("../../../apps/api/src/utils/verify-api-key", () => ({
  verifyApiKey: async () => null,
}));

import { authenticateApiRequest } from "../../../apps/api/src/utils/authenticate-api-request";

type Variables = {
  userId: string;
  session: { id: string } | null;
};

const app = new Hono<{ Variables: Variables }>();
app.use("*", async (c, next) => {
  await authenticateApiRequest(c);
  await next();
});
app.get("/api/ws/user", (c) =>
  c.json({ userId: c.get("userId"), sessionId: c.get("session")?.id }),
);

const encodedToken = Buffer.from("bearer-session-token").toString("base64url");

beforeEach(() => {
  state.sessionLookups = [];
});

describe("authenticateApiRequest with the WebSocket bearer subprotocol", () => {
  it("authenticates an upgrade through the subprotocol and drops cookies", async () => {
    const response = await app.request("/api/ws/user", {
      headers: {
        upgrade: "websocket",
        "sec-websocket-protocol": `kaneo.bearer.${encodedToken}`,
        cookie: "better-auth.session_token=cookie-token",
      },
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      userId: "user-bearer",
      sessionId: "session-bearer",
    });
    const lookup = state.sessionLookups.at(-1);
    expect(lookup?.get("cookie")).toBeNull();
    expect(lookup?.get("authorization")).toBe("Bearer bearer-session-token");
  });

  it("rejects malformed and unknown subprotocol tokens without a cookie fallback", async () => {
    for (const protocol of [
      "kaneo.bearer.not+valid",
      `kaneo.bearer.${Buffer.from("unknown-token").toString("base64url")}`,
    ]) {
      const response = await app.request("/api/ws/user", {
        headers: {
          upgrade: "websocket",
          "sec-websocket-protocol": protocol,
          cookie: "better-auth.session_token=cookie-token",
        },
      });
      expect(response.status).toBe(401);
    }
  });

  it("keeps cookie sessions for upgrades that offer no bearer subprotocol", async () => {
    const response = await app.request("/api/ws/user", {
      headers: {
        upgrade: "websocket",
        cookie: "better-auth.session_token=cookie-token",
      },
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      userId: "user-cookie",
      sessionId: "session-cookie",
    });
  });

  it("ignores the subprotocol header on ordinary requests", async () => {
    const response = await app.request("/api/ws/user", {
      headers: {
        "sec-websocket-protocol": `kaneo.bearer.${encodedToken}`,
      },
    });
    expect(response.status).toBe(401);
  });
});
