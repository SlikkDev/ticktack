import { afterEach, describe, expect, it, vi } from "vite-plus/test";

const { native, listeners } = vi.hoisted(() => ({
  native: { enabled: false },
  listeners: [] as ((event: { url: string }) => void)[],
}));

vi.mock("@capacitor/core", () => ({
  Capacitor: {
    isNativePlatform: () => native.enabled,
    getPlatform: () => (native.enabled ? "ios" : "web"),
  },
}));

vi.mock("@capacitor/app", () => ({
  App: {
    addListener: async (
      _event: string,
      listener: (event: { url: string }) => void,
    ) => {
      listeners.push(listener);
      return { remove: async () => {} };
    },
  },
}));

vi.mock("@capacitor/preferences", () => ({
  Preferences: {
    get: async () => ({ value: "restored-token" }),
    set: async () => {},
    remove: async () => {},
  },
}));

import { listenForAppLinks, prepareNativeShell } from "./shell";

describe("native shell bootstrap", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    native.enabled = false;
    listeners.length = 0;
    globalThis.fetch = originalFetch;
    delete document.documentElement.dataset.nativePlatform;
  });

  it("changes nothing in a browser", async () => {
    await prepareNativeShell();
    const navigate = vi.fn();
    listenForAppLinks(navigate);
    expect(document.documentElement.dataset.nativePlatform).toBeUndefined();
    expect(globalThis.fetch).toBe(originalFetch);
    expect(listeners).toHaveLength(0);
  });

  it("tags the document, restores the token and routes app links natively", async () => {
    native.enabled = true;
    vi.stubEnv("VITE_CLIENT_URL", "https://tasks.example.test");
    await prepareNativeShell();
    expect(document.documentElement.dataset.nativePlatform).toBe("ios");
    expect(globalThis.fetch).not.toBe(originalFetch);

    const navigate = vi.fn();
    listenForAppLinks(navigate);
    expect(listeners).toHaveLength(1);
    listeners[0]?.({
      url: "https://tasks.example.test/invitation/accept/abc?x=1#frag",
    });
    listeners[0]?.({ url: "https://evil.example.test/dashboard" });
    listeners[0]?.({ url: "not a url" });
    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith("/invitation/accept/abc?x=1#frag");
    vi.unstubAllEnvs();
  });
});
