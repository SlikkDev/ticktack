import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import mcpRoutes from "../../apps/api/src/mcp";
import {
  MCP_BODY_BYTES,
  MCP_MAX_IN_FLIGHT,
  MCP_TOOL_INPUT_ELEMENTS,
} from "../../apps/api/src/mcp/http-limits";

const authMocks = vi.hoisted(() => ({
  getSession: vi.fn(async () => ({ user: { id: "test-user" } })),
}));
vi.mock("../../apps/api/src/auth", () => ({
  auth: { api: { getSession: authMocks.getSession } },
}));

const protocol = "2026-07-28";
function request(modern: boolean, args: Record<string, unknown> = {}) {
  return new Request("http://mcp.test/mcp", {
    method: "POST",
    headers: {
      authorization: "Bearer test-token",
      accept: "application/json, text/event-stream",
      "content-type": "application/json",
      ...(modern
        ? {
            "mcp-method": "tools/call",
            "mcp-name": "whoami",
            "mcp-protocol-version": protocol,
          }
        : {}),
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: {
        name: "whoami",
        arguments: args,
        ...(modern
          ? {
              _meta: {
                "io.modelcontextprotocol/protocolVersion": protocol,
                "io.modelcontextprotocol/clientInfo": {
                  name: "limits-test",
                  version: "1.0.0",
                },
                "io.modelcontextprotocol/clientCapabilities": {},
              },
            }
          : {}),
      },
    }),
  });
}
async function rpcBody(response: Response) {
  const text = await response.text();
  const event = text.split("\n").find((line) => line.startsWith("data: "));
  return JSON.parse(event?.slice(6) ?? text);
}
const whoami = () =>
  vi.fn(async () =>
    Response.json({
      user: {
        id: "test-user",
        name: "Test",
        email: "test@example.com",
        role: "user",
      },
    }),
  );

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe.each([false, true])("MCP HTTP limits (modern: %s)", (modern) => {
  it("preserves ordinary authenticated tool calls", async () => {
    const fetch = whoami();
    vi.stubGlobal("fetch", fetch);
    const response = await mcpRoutes.request(request(modern));
    expect(response.status).toBe(200);
    expect((await rpcBody(response)).result.isError).not.toBe(true);
    expect(fetch).toHaveBeenCalledOnce();
    expect(authMocks.getSession).toHaveBeenCalledOnce();
  });

  it.each(["array", "object"])(
    "rejects too many nested %s elements before tool execution",
    async (kind) => {
      const fetch = whoami();
      vi.stubGlobal("fetch", fetch);
      const values = Array.from({ length: MCP_TOOL_INPUT_ELEMENTS }, () => 0);
      const args = {
        extra:
          kind === "array"
            ? values
            : Object.fromEntries(values.map((value, i) => [String(i), value])),
      };
      const response = await mcpRoutes.request(request(modern, args));
      expect(response.status).toBe(200);
      const body = await rpcBody(response);
      expect(body.result.isError).toBe(true);
      expect(body.result.content[0].text).toMatch(/element|limit/i);
      expect(fetch).not.toHaveBeenCalled();
    },
  );

  it("accepts the element budget boundary", async () => {
    const fetch = whoami();
    vi.stubGlobal("fetch", fetch);
    const response = await mcpRoutes.request(
      request(modern, {
        extra: Array.from({ length: MCP_TOOL_INPUT_ELEMENTS - 1 }, () => 0),
      }),
    );
    expect(response.status).toBe(200);
    expect((await rpcBody(response)).result.isError).not.toBe(true);
    expect(fetch).toHaveBeenCalledOnce();
  });

  it("accepts exactly the byte budget and rejects one extra byte before cloning", async () => {
    const original = request(modern);
    const json = await original.text();
    const body = json + " ".repeat(MCP_BODY_BYTES - Buffer.byteLength(json));
    const fetch = whoami();
    vi.stubGlobal("fetch", fetch);
    const atLimit = new Request(original.url, {
      method: "POST",
      headers: original.headers,
      body,
    });
    expect((await mcpRoutes.request(atLimit)).status).toBe(200);
    expect(fetch).toHaveBeenCalledOnce();
    fetch.mockClear();
    const overLimit = new Request(original.url, {
      method: "POST",
      headers: original.headers,
      body: body + " ",
    });
    const clone = vi.spyOn(overLimit, "clone");
    expect((await mcpRoutes.request(overLimit)).status).toBe(413);
    expect(clone).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each([undefined, "1", String(MCP_BODY_BYTES + 1)])(
    "bounds streamed bytes with Content-Length %s",
    async (length) => {
      const cancel = vi.fn();
      const body = new ReadableStream({
        pull(controller) {
          controller.enqueue(new Uint8Array(16 * 1024));
        },
        cancel,
      });
      const headers = request(modern).headers;
      if (length !== undefined) headers.set("content-length", length);
      const streamed = new Request("http://mcp.test/mcp", {
        method: "POST",
        headers,
        body,
        duplex: "half",
      } as RequestInit);
      const clone = vi.spyOn(streamed, "clone");
      expect((await mcpRoutes.request(streamed)).status).toBe(413);
      expect(cancel).toHaveBeenCalledOnce();
      expect(clone).not.toHaveBeenCalled();
    },
  );

  it("keeps unauthenticated requests ahead of parsing", async () => {
    const incoming = request(modern, { extra: "x".repeat(MCP_BODY_BYTES) });
    incoming.headers.delete("authorization");
    expect((await mcpRoutes.request(incoming)).status).toBe(401);
    expect(authMocks.getSession).not.toHaveBeenCalled();
  });
});

it("bounds slow requests and releases capacity on timeout", async () => {
  vi.useFakeTimers();
  const pending = Array.from({ length: MCP_MAX_IN_FLIGHT }, () => {
    const original = request(false);
    return mcpRoutes.request(
      new Request(original.url, {
        method: "POST",
        headers: original.headers,
        body: new ReadableStream(),
        duplex: "half",
      } as RequestInit),
    );
  });
  // Authentication resolves asynchronously before the bounded reader begins.
  await vi.advanceTimersByTimeAsync(0);
  const denied = await mcpRoutes.request(request(false));
  expect(denied.status).toBe(429);
  expect(denied.headers.get("retry-after")).toBe("1");
  await vi.advanceTimersByTimeAsync(5_001);
  expect(
    (await Promise.all(pending)).every((response) => response.status === 408),
  ).toBe(true);
  vi.stubGlobal("fetch", whoami());
  expect((await mcpRoutes.request(request(false))).status).toBe(200);
});
