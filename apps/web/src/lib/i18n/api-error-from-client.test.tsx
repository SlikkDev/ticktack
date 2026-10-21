import english from "@i18n/en-US.json";
import hebrew from "@i18n/he-IL.json";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, renderHook } from "@testing-library/react";
import i18n from "i18next";
import type { ReactNode } from "react";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vite-plus/test";
import createWorkspace from "@/fetchers/workspace/create-workspace";
import useDeleteAccount, {
  SESSION_TOO_OLD,
} from "@/hooks/mutations/use-delete-account";
import useCreateWorkspace from "@/hooks/queries/workspace/use-create-workspace";
import { parseApiError } from "@/lib/error-handler";
import queryClient from "@/query-client";
import { getErrorMessageForClassification } from "./api-error-classification";
import { ApiClientError } from "./api-error-from-client";
import { getApiErrorMessage } from "./api-error-message";

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  list: vi.fn(),
  deleteUser: vi.fn(),
}));
vi.mock("@/lib/auth-client", () => ({
  authClient: {
    organization: { create: mocks.create, list: mocks.list },
    deleteUser: mocks.deleteUser,
  },
}));
vi.mock("@sentry/react", () => ({ captureException: vi.fn() }));
vi.mock("i18next", async (importOriginal) => {
  const { default: i18next } = await importOriginal<typeof import("i18next")>();
  return { default: i18next.createInstance() };
});

beforeEach(async () => {
  vi.resetAllMocks();
  await i18n.init({
    lng: "he-IL",
    fallbackLng: "en-US",
    resources: { "en-US": english, "he-IL": hebrew },
  });
  mocks.list.mockResolvedValue({ data: [] });
});
afterEach(cleanup);

function wrapper({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { mutations: { retry: false } } })
      }
    >
      {children}
    </QueryClientProvider>
  );
}

describe("ApiClientError", () => {
  it("keeps machine-readable details and localizes only the displayed message", () => {
    const upstream = {
      message: "Insufficient permissions",
      code: "MISSING_PERMISSION",
      status: 403,
      issues: [{ path: "body.title", message: "Required" }],
    };
    const error = new ApiClientError(upstream);
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe(hebrew.common.apiErrors.forbidden);
    expect(error.code).toBe(upstream.code);
    expect(error.status).toBe(403);
    expect(error.issues).toEqual(upstream.issues);
    expect(error.originalMessage).toBe(upstream.message);
    expect(upstream.message).toBe("Insufficient permissions");
  });

  it("preserves network classification and the existing no-retry behavior", () => {
    const error = new ApiClientError({ message: "Failed to fetch" });
    expect(error.message).toBe(hebrew.common.error.messages.network);
    expect(getErrorMessageForClassification(error)).toBe("Failed to fetch");
    expect(parseApiError(error).type).toBe("cors");
    const retry = queryClient.getDefaultOptions().queries?.retry;
    if (typeof retry !== "function") throw new Error("Expected retry function");
    expect(retry(0, error)).toBe(false);
  });

  it("leaves plain Error classification unchanged", () => {
    expect(getErrorMessageForClassification(new Error("Load failed"))).toBe(
      "Load failed",
    );
  });

  it("can present the same error after switching back to English", async () => {
    const error = new ApiClientError({
      code: "MISSING_PERMISSION",
      status: 403,
      message: "Custom permission guidance",
    });
    expect(error.message).toBe(hebrew.common.apiErrors.forbidden);
    await i18n.changeLanguage("en-US");
    expect(getApiErrorMessage(error)).toBe("Custom permission guidance");
  });
});

describe("workspace creation retries in Hebrew", () => {
  it("retries an English slug collision before localizing the failure", async () => {
    mocks.create
      .mockResolvedValueOnce({
        error: {
          message: "Workspace slug already exists",
          code: "CONFLICT",
          status: 409,
        },
      })
      .mockResolvedValueOnce({ data: { id: "workspace-new" } });
    await expect(createWorkspace({ name: "צוות" })).resolves.toEqual({
      id: "workspace-new",
    });
    expect(mocks.create).toHaveBeenCalledTimes(2);
    expect(mocks.create.mock.calls[0][0].slug).not.toBe(
      mocks.create.mock.calls[1][0].slug,
    );
  });

  it("does not retry an explicitly supplied slug and keeps the final error details", async () => {
    mocks.create.mockResolvedValue({
      error: {
        message: "Workspace slug already exists",
        code: "CONFLICT",
        status: 409,
      },
    });
    await expect(
      createWorkspace({ name: "צוות", slug: "team" }),
    ).rejects.toMatchObject({
      code: "CONFLICT",
      status: 409,
      message: hebrew.common.apiErrors.conflict,
    });
    expect(mocks.create).toHaveBeenCalledOnce();
  });

  it("still stops after five collisions", async () => {
    mocks.create.mockResolvedValue({
      error: {
        message: "Workspace already exists",
        code: "CONFLICT",
        status: 409,
      },
    });
    await expect(createWorkspace({ name: "צוות" })).rejects.toMatchObject({
      code: "CONFLICT",
      status: 409,
      message: hebrew.common.apiErrors.conflict,
    });
    expect(mocks.create).toHaveBeenCalledTimes(5);
  });

  it("preserves the hook retry flow as well as the fetcher", async () => {
    mocks.create
      .mockResolvedValueOnce({
        error: {
          message: "Workspace slug already exists",
          code: "CONFLICT",
          status: 409,
        },
      })
      .mockResolvedValueOnce({ data: { id: "workspace-new" } });
    const { result } = renderHook(useCreateWorkspace, { wrapper });
    await act(async () => {
      await expect(
        result.current.mutateAsync({ name: "צוות" }),
      ).resolves.toEqual({ id: "workspace-new" });
    });
    expect(mocks.create).toHaveBeenCalledTimes(2);
  });
});

describe("account deletion session sentinel", () => {
  it("still asks for a fresh session when BetterAuth returns SESSION_EXPIRED", async () => {
    mocks.deleteUser.mockResolvedValue({
      error: {
        code: "SESSION_EXPIRED",
        status: 401,
        message: "Session expired",
      },
    });
    const { result } = renderHook(useDeleteAccount, { wrapper });
    await act(async () => {
      await expect(result.current.mutateAsync()).rejects.toThrow(
        SESSION_TOO_OLD,
      );
    });
  });

  it("preserves actionable ownership failures", async () => {
    mocks.deleteUser.mockResolvedValue({
      error: {
        code: "SOLE_WORKSPACE_OWNER",
        status: 409,
        message: "Cannot delete owner",
      },
    });
    const { result } = renderHook(useDeleteAccount, { wrapper });
    await act(async () => {
      await expect(result.current.mutateAsync()).rejects.toMatchObject({
        code: "SOLE_WORKSPACE_OWNER",
        status: 409,
        message: hebrew.common.apiErrors.soleWorkspaceOwner,
      });
    });
  });
});
