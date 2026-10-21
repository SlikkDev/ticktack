import type { MiddlewareHandler } from "hono";
import { boundedRequestBody } from "../utils/bounded-request-body";
import { McpExecution } from "./execution";

// Tools accept small, flat argument objects and text descriptions. Bound the
// envelope before protocol detection, then bound validation work in each SDK.
export const MCP_BODY_BYTES = 256 * 1024;
export const MCP_TOOL_INPUT_ELEMENTS = 1_024;
export const MCP_MAX_IN_FLIGHT = 16;
const checkBody = boundedRequestBody(MCP_BODY_BYTES);
let activeRequests = 0;

export const mcpRequestBounds: MiddlewareHandler<{
  Variables: { mcpExecution: McpExecution };
}> = async (c, next) => {
  if (activeRequests >= MCP_MAX_IN_FLIGHT) {
    void c.req.raw.body?.cancel().catch(() => {});
    return c.json({ error: "temporarily_unavailable" }, 429, {
      "Retry-After": "1",
      "Cache-Control": "no-store",
    });
  }
  activeRequests++;
  const execution = new McpExecution(c.req.raw.signal, () => activeRequests--);
  c.set("mcpExecution", execution);
  c.req.raw = new Request(c.req.raw, { signal: execution.signal });
  try {
    await checkBody(c, next);
    c.res = execution.wrapResponse(c.res);
  } catch (error) {
    execution.abort(error);
    execution.finish();
    throw error;
  }
};
