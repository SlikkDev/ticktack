import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { getConfiguredCorsOrigins } from "../../../apps/api/src/utils/cors-origins";

afterEach(() => vi.unstubAllEnvs());

describe("getConfiguredCorsOrigins", () => {
  it("prefers CORS_ORIGINS and trims each entry", () => {
    vi.stubEnv("KANEO_CLIENT_URL", "https://app.example.test");
    vi.stubEnv(
      "CORS_ORIGINS",
      " https://app.example.test, capacitor://localhost ,https://localhost,",
    );
    expect(getConfiguredCorsOrigins()).toEqual([
      "https://app.example.test",
      "capacitor://localhost",
      "https://localhost",
    ]);
  });

  it("falls back to KANEO_CLIENT_URL, then to nothing", () => {
    vi.stubEnv("CORS_ORIGINS", "  ");
    vi.stubEnv("KANEO_CLIENT_URL", "https://app.example.test");
    expect(getConfiguredCorsOrigins()).toEqual(["https://app.example.test"]);
    vi.stubEnv("KANEO_CLIENT_URL", "");
    expect(getConfiguredCorsOrigins()).toBeUndefined();
  });
});
