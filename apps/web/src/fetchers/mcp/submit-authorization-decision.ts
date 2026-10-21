import { getApiUrl } from "@/fetchers/get-api-url";
import { ApiClientError } from "@/lib/i18n/api-error-from-client";

export async function submitMcpAuthorizationDecision(
  requestId: string,
  approved: boolean,
): Promise<string> {
  const response = await fetch(
    getApiUrl(`/mcp/authorize/request/${encodeURIComponent(requestId)}`),
    {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ approved }),
    },
  );
  if (!response.ok) {
    throw new ApiClientError({
      code: "MCP_AUTHORIZATION_FAILED",
      status: response.status,
      message: "Could not complete the authorization request.",
    });
  }

  const body = (await response.json()) as { redirect: string };
  return body.redirect;
}
