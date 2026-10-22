import { getWebSocketBearerProtocols } from "./native/api-auth";

/** Opens an API WebSocket; native shells authenticate it with a subprotocol. */
export function openApiWebSocket(url: string): WebSocket {
  const protocols = getWebSocketBearerProtocols();
  return protocols ? new WebSocket(url, protocols) : new WebSocket(url);
}
