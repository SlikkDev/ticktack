import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import mcpRoutes from "../../apps/api/src/mcp";
import { MCP_EXECUTION_TIMEOUT_MS } from "../../apps/api/src/mcp/execution";
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
    const accepted = await mcpRoutes.request(atLimit);
    expect(accepted.status).toBe(200);
    await rpcBody(accepted);
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
  const recovered = await mcpRoutes.request(request(false));
  expect(recovered.status).toBe(200);
  await rpcBody(recovered);
});

describe.each([false, true])(
  "MCP execution lifetime (modern: %s)",
  (modern) => {
    // Keep aborted work pending until the test acknowledges cancellation. Merely
    // sending an abort must not release a slot while the tool is still running.
    function stalledTools() {
      const calls: {
        signal: AbortSignal;
        resolve: (response: Response) => void;
        reject: (reason: Error) => void;
      }[] = [];
      vi.stubGlobal(
        "fetch",
        vi.fn(
          (_url, init: RequestInit) =>
            new Promise<Response>((resolve, reject) => {
              calls.push({ signal: init.signal!, resolve, reject });
            }),
        ),
      );
      return calls;
    }

    const finishCall = () => Response.json({ user: { id: "test-user" } });
    const consume = async (response: Response) => {
      await response.text();
      return response;
    };
    const tick = () => vi.advanceTimersByTimeAsync(0);

    it.each(["completion", "error", "disconnect", "timeout"])(
      "holds slots until tool settlement after %s and then recovers capacity",
      async (ending) => {
        vi.useFakeTimers();
        const calls = stalledTools();
        const controllers = Array.from(
          { length: MCP_MAX_IN_FLIGHT },
          () => new AbortController(),
        );
        const pending = controllers.map((controller) =>
          mcpRoutes
            .request(
              new Request(request(modern), { signal: controller.signal }),
            )
            .then(consume),
        );
        await tick();
        expect(calls).toHaveLength(MCP_MAX_IN_FLIGHT);
        expect((await mcpRoutes.request(request(modern))).status).toBe(429);

        if (ending === "disconnect") {
          controllers.forEach((controller) => controller.abort());
        } else if (ending === "timeout") {
          await vi.advanceTimersByTimeAsync(MCP_EXECUTION_TIMEOUT_MS + 1);
        }
        if (ending === "disconnect" || ending === "timeout") {
          expect(calls.every((call) => call.signal.aborted)).toBe(true);
          // Even after response cancellation, uncooperative tools retain slots.
          expect((await mcpRoutes.request(request(modern))).status).toBe(429);
        }

        calls.forEach((call) => {
          if (ending === "completion") call.resolve(finishCall());
          else call.reject(new Error("Synthetic tool stopped"));
        });
        await Promise.all(pending);
        // Cancelled response bodies can close before the tool's rejection has
        // propagated through the registrar; drain those completion microtasks.
        await tick();
        vi.stubGlobal("fetch", whoami());
        const recovered = await mcpRoutes.request(request(modern));
        expect(recovered.status).toBe(200);
        expect((await rpcBody(recovered)).result.isError).not.toBe(true);
      },
    );

    if (!modern) {
      it("cancels legacy response streams without freeing running tool slots", async () => {
        vi.useFakeTimers();
        const calls = stalledTools();
        const responses = await Promise.all(
          Array.from({ length: MCP_MAX_IN_FLIGHT }, () =>
            mcpRoutes.request(request(false)),
          ),
        );
        await tick();
        expect(calls).toHaveLength(MCP_MAX_IN_FLIGHT);
        expect(
          responses.every((response) =>
            response.headers.get("content-type")?.includes("text/event-stream"),
          ),
        ).toBe(true);
        await Promise.all(responses.map((response) => response.body!.cancel()));
        expect(calls.every((call) => call.signal.aborted)).toBe(true);
        expect((await mcpRoutes.request(request(false))).status).toBe(429);
        calls.forEach((call) =>
          call.reject(new Error("Synthetic cancellation acknowledged")),
        );
        await tick();
        vi.stubGlobal("fetch", whoami());
        const recovered = await mcpRoutes.request(request(false));
        expect(recovered.status).toBe(200);
        await rpcBody(recovered);
      });
    }
  },
);
