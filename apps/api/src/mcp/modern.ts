import { createMcpHandler, McpServer } from "@modelcontextprotocol/server";
import { MCP_BODY_BYTES, MCP_TOOL_INPUT_ELEMENTS } from "./http-limits";
import { registerMcpTools, toMcpToolRegistrar } from "./tools";

/** Create a stateless MCP 2026 handler with a fresh server per request. */
export function createModernMcpHandler(token: string, apiUrl: string) {
  return createMcpHandler(
    () => {
      const server = new McpServer(
        { name: "kaneo-mcp", version: "1.0.0" },
        { maxToolInputElements: MCP_TOOL_INPUT_ELEMENTS },
      );
      registerMcpTools(toMcpToolRegistrar(server), apiUrl, token);
      return server;
    },
    { legacy: "reject", maxRequestBodySize: MCP_BODY_BYTES },
  );
}
