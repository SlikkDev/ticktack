import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vite-plus/test";

const { native, setSession } = vi.hoisted(() => ({
  native: { platform: false, plugin: false },
  setSession: vi.fn<(session: unknown) => Promise<void>>(),
}));

vi.mock("@capacitor/core", () => ({
  Capacitor: {
    isNativePlatform: () => native.platform,
    isPluginAvailable: (name: string) =>
      name === "NativeSession" && native.plugin,
  },
  registerPlugin: () => ({ setSession }),
}));

import { configureNativeSession, pushNativeSession } from "./native-session";

describe("native session hand-off", () => {
  beforeEach(() => {
    setSession.mockReset();
    setSession.mockResolvedValue(undefined);
    configureNativeSession("https://tasks.example.test/api");
  });

  afterEach(() => {
    native.platform = false;
    native.plugin = false;
  });

  it("does nothing in a browser or in a shell without the plugin", async () => {
    await pushNativeSession("token");
    native.platform = true;
    await pushNativeSession("token");
    expect(setSession).not.toHaveBeenCalled();
  });

  it("forwards the API base URL with every token change, including sign-out", async () => {
    native.platform = true;
    native.plugin = true;
    await pushNativeSession("issued-token");
    await pushNativeSession(null);
    expect(setSession.mock.calls).toEqual([
      [{ apiUrl: "https://tasks.example.test/api", token: "issued-token" }],
      [{ apiUrl: "https://tasks.example.test/api", token: null }],
    ]);
  });

  it("swallows plugin failures so the phone app keeps working", async () => {
    native.platform = true;
    native.plugin = true;
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    setSession.mockRejectedValueOnce(new Error("keychain locked"));
    await expect(pushNativeSession("token")).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalledOnce();
    warn.mockRestore();
  });
});
