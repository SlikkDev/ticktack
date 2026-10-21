import { registerTools, type ToolRegistrar } from "@kaneo/mcp/tools";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { z } from "zod";
import type { McpExecution } from "./execution";

export type McpToolRegistrar = ToolRegistrar;

type ShapeToolServer = {
  registerTool(
    name: string,
    config: { description: string; inputSchema: z.ZodRawShape },
    callback: (args: unknown) => Promise<CallToolResult>,
  ): unknown;
};

export function toMcpToolRegistrar(
  server: ShapeToolServer,
  execution?: McpExecution,
): McpToolRegistrar {
  return {
    registerTool: (name, config, callback) =>
      server.registerTool(
        name,
        {
          description: config.description,
          inputSchema: config.inputSchema.shape,
        },
        (args) =>
          execution ? execution.run(() => callback(args)) : callback(args),
      ),
  };
}

class ApiClient {
  readonly usingApiKey = false;
  constructor(
    private baseUrl: string,
    private token: string,
    private signal?: AbortSignal,
  ) {}

  async json<T = unknown>(path: string, init?: RequestInit): Promise<T> {
    const headers = new Headers(init?.headers);
    headers.set("Authorization", `Bearer ${this.token}`);
    if (init?.body != null && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    const url = `${this.baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
    const res = await fetch(url, {
      ...init,
      headers,
      signal: AbortSignal.any([
        AbortSignal.timeout(10_000),
        ...(this.signal ? [this.signal] : []),
        ...(init?.signal ? [init.signal] : []),
      ]),
    });

    const text = await res.text();
    let body: unknown = null;
    if (text) {
      try {
        body = JSON.parse(text);
      } catch {
        body = text;
      }
    }
    if (!res.ok) {
      const detail =
        typeof body === "object" && body !== null && "message" in body
          ? (body as { message: string }).message
          : typeof body === "string" && body.length > 0
            ? body.slice(0, 500)
            : `HTTP ${res.status}`;
      throw new Error(`${path}: ${detail}`);
    }
    return body as T;
  }
}

export function registerMcpTools(
  server: McpToolRegistrar,
  baseUrl: string,
  token: string,
  signal?: AbortSignal,
): void {
  registerTools(server, { client: new ApiClient(baseUrl, token, signal) });
}
