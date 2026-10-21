import type { MiddlewareHandler } from "hono";
import { boundedRequestBody } from "../utils/bounded-request-body";

// Tools accept small, flat argument objects and text descriptions. Bound the
// envelope before protocol detection, then bound validation work in each SDK.
export const MCP_BODY_BYTES = 256 * 1024;
export const MCP_TOOL_INPUT_ELEMENTS = 1_024;
export const MCP_MAX_IN_FLIGHT = 16;
const checkBody = boundedRequestBody(MCP_BODY_BYTES);
let activeRequests = 0;

export const mcpRequestBounds: MiddlewareHandler = async (c, next) => {
  if (activeRequests >= MCP_MAX_IN_FLIGHT) {
    void c.req.raw.body?.cancel().catch(() => {});
    return c.json({ error: "temporarily_unavailable" }, 429, {
      "Retry-After": "1",
      "Cache-Control": "no-store",
    });
  }
  activeRequests++;
  try {
    return await checkBody(c, next);
  } finally {
    activeRequests--;
  }
};
