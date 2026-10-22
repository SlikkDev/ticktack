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
      name === "WatchBridge" && native.plugin,
  },
  registerPlugin: () => ({ setSession }),
}));

import { configureWatchSession, pushWatchSession } from "./watch-session";

describe("watch session relay", () => {
  beforeEach(() => {
    setSession.mockReset();
    setSession.mockResolvedValue(undefined);
    configureWatchSession("https://tasks.example.test");
  });

  afterEach(() => {
    native.platform = false;
    native.plugin = false;
  });

  it("does nothing in a browser or in a shell without the bridge", async () => {
    await pushWatchSession("token");
    native.platform = true;
    await pushWatchSession("token");
    expect(setSession).not.toHaveBeenCalled();
  });

  it("forwards the API origin with every token change, including sign-out", async () => {
    native.platform = true;
    native.plugin = true;
    await pushWatchSession("issued-token");
    await pushWatchSession(null);
    expect(setSession.mock.calls).toEqual([
      [{ apiUrl: "https://tasks.example.test", token: "issued-token" }],
      [{ apiUrl: "https://tasks.example.test", token: null }],
    ]);
  });

  it("swallows bridge failures so the phone app keeps working", async () => {
    native.platform = true;
    native.plugin = true;
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    setSession.mockRejectedValueOnce(new Error("watch unreachable"));
    await expect(pushWatchSession("token")).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalledOnce();
    warn.mockRestore();
  });
});
