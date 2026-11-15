import { describe, expect, it } from "vite-plus/test";
import { readBuildInfo } from "./read-build-info";

describe("readBuildInfo", () => {
  it("reports the commit and version the image was built with", () => {
    expect(
      readBuildInfo({
        KANEO_BUILD_COMMIT: " 273B1C9B5A8E0F1D2C3B4A59687766554433221F ",
        KANEO_BUILD_VERSION: "ticktack-2026.11.15",
      }),
    ).toEqual({
      commit: "273b1c9b5a8e0f1d2c3b4a59687766554433221f",
      version: "ticktack-2026.11.15",
    });
  });

  it("reports unknown instead of echoing anything else", () => {
    expect(readBuildInfo({})).toEqual({ commit: null, version: null });
    expect(
      readBuildInfo({
        KANEO_BUILD_COMMIT: "main; rm -rf /",
        KANEO_BUILD_VERSION: "<script>",
      }),
    ).toEqual({ commit: null, version: null });
  });
});
