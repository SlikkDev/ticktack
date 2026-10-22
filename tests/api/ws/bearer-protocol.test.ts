import { describe, expect, it } from "vite-plus/test";
import { readWebSocketBearerToken } from "../../../apps/api/src/ws/bearer-protocol";

const token = "abcDEF123.sig_-value";
const encoded = Buffer.from(token, "utf8").toString("base64url");

function upgradeHeaders(protocols?: string) {
  return new Headers({
    upgrade: "websocket",
    ...(protocols ? { "sec-websocket-protocol": protocols } : {}),
  });
}

describe("readWebSocketBearerToken", () => {
  it("decodes the kaneo.bearer subprotocol on upgrade requests", () => {
    expect(
      readWebSocketBearerToken(upgradeHeaders(`kaneo.bearer.${encoded}`)),
    ).toEqual({ token, malformed: false });
    expect(
      readWebSocketBearerToken(
        upgradeHeaders(`other, kaneo.bearer.${encoded} , more`),
      ),
    ).toEqual({ token, malformed: false });
  });

  it("ignores ordinary requests and unrelated subprotocols", () => {
    expect(
      readWebSocketBearerToken(
        new Headers({ "sec-websocket-protocol": `kaneo.bearer.${encoded}` }),
      ),
    ).toEqual({ token: null, malformed: false });
    expect(readWebSocketBearerToken(upgradeHeaders())).toEqual({
      token: null,
      malformed: false,
    });
    expect(readWebSocketBearerToken(upgradeHeaders("graphql-ws"))).toEqual({
      token: null,
      malformed: false,
    });
  });

  it("rejects malformed tokens instead of treating them as anonymous", () => {
    for (const protocol of [
      "kaneo.bearer.",
      "kaneo.bearer.not+base64url",
      `kaneo.bearer.${Buffer.from("has space").toString("base64url")}`,
      `kaneo.bearer.${Buffer.from("").toString("base64url")}`,
    ]) {
      expect(readWebSocketBearerToken(upgradeHeaders(protocol))).toEqual({
        token: null,
        malformed: true,
      });
    }
  });
});
