import {
  createHash,
  generateKeyPairSync,
  randomBytes,
  sign,
} from "node:crypto";

type Cbor = string | number | Buffer | Map<Cbor, Cbor>;
function head(major: number, length: number): Buffer {
  if (length < 24) return Buffer.from([(major << 5) | length]);
  if (length < 256) return Buffer.from([(major << 5) | 24, length]);
  const result = Buffer.alloc(3);
  result[0] = (major << 5) | 25;
  result.writeUInt16BE(length, 1);
  return result;
}
function cbor(value: Cbor): Buffer {
  if (typeof value === "number")
    return head(value < 0 ? 1 : 0, value < 0 ? -1 - value : value);
  if (value instanceof Map)
    return Buffer.concat([
      head(5, value.size),
      ...[...value].flatMap(([key, item]) => [cbor(key), cbor(item)]),
    ]);
  const bytes = typeof value === "string" ? Buffer.from(value) : value;
  return Buffer.concat([
    head(typeof value === "string" ? 3 : 2, bytes.length),
    bytes,
  ]);
}
const hash = (value: Buffer | string) =>
  createHash("sha256").update(value).digest();
const encoded = (value: Buffer) => value.toString("base64url");

// A software authenticator exercises the real SDK's cryptographic checks;
// these keys are synthetic and never leave the isolated test database.
export function virtualPasskey() {
  const { publicKey, privateKey } = generateKeyPairSync("ec", {
    namedCurve: "prime256v1",
  });
  const jwk = publicKey.export({ format: "jwk" });
  const credentialId = randomBytes(32);
  const cose = cbor(
    new Map<Cbor, Cbor>([
      [1, 2],
      [3, -7],
      [-1, 1],
      [-2, Buffer.from(jwk.x!, "base64url")],
      [-3, Buffer.from(jwk.y!, "base64url")],
    ]),
  );
  const clientData = (type: string, challenge: string, origin: string) =>
    Buffer.from(
      JSON.stringify({ type, challenge, origin, crossOrigin: false }),
    );
  const base = {
    id: encoded(credentialId),
    rawId: encoded(credentialId),
    type: "public-key",
    clientExtensionResults: {},
    authenticatorAttachment: "platform",
  };
  return {
    id: encoded(credentialId),
    registration(
      challenge: string,
      verified = true,
      origin = "http://localhost:5173",
      rpId = "localhost",
    ) {
      const length = Buffer.alloc(2);
      length.writeUInt16BE(credentialId.length);
      const authData = Buffer.concat([
        hash(rpId),
        Buffer.from([0x41 | (verified ? 4 : 0)]),
        Buffer.alloc(4),
        Buffer.alloc(16),
        length,
        credentialId,
        cose,
      ]);
      const attestation = cbor(
        new Map<Cbor, Cbor>([
          ["fmt", "none"],
          ["attStmt", new Map()],
          ["authData", authData],
        ]),
      );
      return {
        ...base,
        response: {
          clientDataJSON: encoded(
            clientData("webauthn.create", challenge, origin),
          ),
          attestationObject: encoded(attestation),
          transports: ["internal"],
        },
      };
    },
    authentication(
      challenge: string,
      counter = 1,
      verified = true,
      origin = "http://localhost:5173",
      rpId = "localhost",
    ) {
      const count = Buffer.alloc(4);
      count.writeUInt32BE(counter);
      const authData = Buffer.concat([
        hash(rpId),
        Buffer.from([1 | (verified ? 4 : 0)]),
        count,
      ]);
      const data = clientData("webauthn.get", challenge, origin);
      return {
        ...base,
        response: {
          clientDataJSON: encoded(data),
          authenticatorData: encoded(authData),
          signature: encoded(
            sign("sha256", Buffer.concat([authData, hash(data)]), privateKey),
          ),
          userHandle: null,
        },
      };
    },
  };
}
