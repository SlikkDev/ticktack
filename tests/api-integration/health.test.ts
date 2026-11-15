import { describe, expect, it, vi } from "vite-plus/test";
import { createApp } from "../../apps/api/src/index";

describe("API integration: health", () => {
  it("responds with ok on /api/health", async () => {
    const { app } = createApp();

    const response = await app.request("/api/health");

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      status: "ok",
      commit: null,
      version: null,
    });
  });

  it("names the commit and version the image was built from", async () => {
    const commit = "273b1c9b5a8e0f1d2c3b4a59687766554433221f";
    vi.stubEnv("KANEO_BUILD_COMMIT", commit);
    vi.stubEnv("KANEO_BUILD_VERSION", "ticktack-2026.11.15");
    try {
      const { app } = createApp();
      const response = await app.request("/api/health");
      await expect(response.json()).resolves.toEqual({
        status: "ok",
        commit,
        version: "ticktack-2026.11.15",
      });
    } finally {
      vi.unstubAllEnvs();
    }
  });
});
