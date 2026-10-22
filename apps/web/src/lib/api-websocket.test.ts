import { afterEach, describe, expect, it, vi } from "vite-plus/test";

const { tokens } = vi.hoisted(() => ({
  tokens: { protocols: undefined as string[] | undefined },
}));

vi.mock("./native/api-auth", () => ({
  getWebSocketBearerProtocols: () => tokens.protocols,
}));

import { openApiWebSocket } from "./api-websocket";

describe("openApiWebSocket", () => {
  const WebSocketMock = vi.fn();
  vi.stubGlobal("WebSocket", WebSocketMock);

  afterEach(() => {
    WebSocketMock.mockClear();
    tokens.protocols = undefined;
  });

  it("opens plain sockets in the browser", () => {
    openApiWebSocket("wss://api.example.test/api/ws/user");
    expect(WebSocketMock).toHaveBeenCalledWith(
      "wss://api.example.test/api/ws/user",
    );
  });

  it("offers the bearer subprotocol in native shells", () => {
    tokens.protocols = ["kaneo.bearer.dG9rZW4"];
    openApiWebSocket("wss://api.example.test/api/ws/user");
    expect(WebSocketMock).toHaveBeenCalledWith(
      "wss://api.example.test/api/ws/user",
      ["kaneo.bearer.dG9rZW4"],
    );
  });
});
