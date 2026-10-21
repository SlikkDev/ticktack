import { getApiUrl } from "@/fetchers/get-api-url";
import { ApiClientError } from "@/lib/i18n/api-error-from-client";

export type McpAuthorizationRequest = {
  clientName: string;
  redirectUri: string;
};

export async function getMcpAuthorizationRequest(
  requestId: string,
): Promise<McpAuthorizationRequest> {
  const response = await fetch(
    getApiUrl(`/mcp/authorize/request/${encodeURIComponent(requestId)}`),
    { credentials: "include" },
  );
  if (!response.ok) {
    throw new ApiClientError({
      code: "MCP_AUTHORIZATION_EXPIRED",
      status: response.status,
      message: "This authorization request is invalid or has expired.",
    });
  }

  const body = (await response.json()) as {
    client_name: string;
    redirect_uri: string;
  };
  return {
    clientName: body.client_name,
    redirectUri: body.redirect_uri,
  };
}
