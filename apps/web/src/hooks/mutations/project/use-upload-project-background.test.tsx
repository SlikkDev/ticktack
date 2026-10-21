import english from "@i18n/en-US.json";
import hebrew from "@i18n/he-IL.json";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, renderHook } from "@testing-library/react";
import i18n from "i18next";
import type { ReactNode } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vite-plus/test";
import { toast } from "@/lib/toast";
import useUploadProjectBackground from "./use-upload-project-background";

const mocks = vi.hoisted(() => ({
  prepare: vi.fn(),
  finalize: vi.fn(),
  storage: vi.fn(),
}));
vi.mock("@kaneo/libs", () => ({
  client: {
    project: {
      ":id": {
        "background-upload": {
          $put: mocks.prepare,
          finalize: { $post: mocks.finalize },
        },
      },
    },
  },
}));
vi.mock("i18next", async (importOriginal) => {
  const { default: i18next } = await importOriginal<typeof import("i18next")>();
  return { default: i18next.createInstance() };
});
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => i18n.t(key) }),
}));
vi.mock("@/lib/toast", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

let client: QueryClient;
beforeEach(async () => {
  vi.resetAllMocks();
  await i18n.init({
    lng: "he-IL",
    resources: { "en-US": english, "he-IL": hebrew },
  });
  client = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  vi.stubGlobal("fetch", mocks.storage);
  mocks.prepare.mockResolvedValue(
    Response.json({
      uploadUrl: "https://storage.example.test/background",
      headers: { "Content-Type": "image/png" },
      key: "background-key",
      version: "version-1",
    }),
  );
  mocks.storage.mockResolvedValue(
    new Response("<Error>Original storage diagnostic</Error>", {
      status: 403,
    }),
  );
});
afterEach(() => {
  cleanup();
  client.clear();
  vi.unstubAllGlobals();
});

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

it.each([
  ["he-IL", hebrew.settings.projectGeneral.backgroundUploadError],
  ["en-US", english.settings.projectGeneral.backgroundUploadError],
])(
  "shows localized upload guidance in %s and stops before finalizing a storage failure",
  async (locale, message) => {
    await i18n.changeLanguage(locale);
    const { result } = renderHook(useUploadProjectBackground, { wrapper });
    await act(async () => {
      await expect(
        result.current.mutateAsync({
          projectId: "project",
          file: new File(["image"], "background.png", { type: "image/png" }),
        }),
      ).rejects.toMatchObject({ name: "Error", message: "" });
    });
    expect(mocks.storage).toHaveBeenCalledTimes(1);
    expect(mocks.finalize).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith(message);
    expect(toast.success).not.toHaveBeenCalled();
  },
);
