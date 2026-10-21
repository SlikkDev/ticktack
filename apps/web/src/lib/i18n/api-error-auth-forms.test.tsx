import english from "@i18n/en-US.json";
import hebrew from "@i18n/he-IL.json";
import { act, cleanup, renderHook } from "@testing-library/react";
import i18n from "i18next";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vite-plus/test";
import { useGuestSignIn } from "@/components/auth/use-guest-sign-in";
import { useProviderSignIn } from "@/components/auth/use-provider-sign-in";

const mocks = vi.hoisted(() => ({
  anonymous: vi.fn(),
  social: vi.fn(),
  oauth2: vi.fn(),
  error: vi.fn(),
}));

vi.mock("i18next", async (importOriginal) => {
  const { default: i18next } = await importOriginal<typeof import("i18next")>();
  return { default: i18next.createInstance() };
});
vi.mock("react-i18next", async () => {
  const { default: instance } = await import("i18next");
  return { useTranslation: () => ({ t: instance.t.bind(instance) }) };
});
vi.mock("@/lib/auth-client", () => ({
  authClient: {
    signIn: {
      anonymous: mocks.anonymous,
      social: mocks.social,
      oauth2: mocks.oauth2,
    },
  },
}));
vi.mock("@/lib/toast", () => ({ toast: { error: mocks.error } }));

const captcha = {
  siteKey: "",
  key: 0,
  reset: vi.fn(),
  headers: undefined,
  pending: false,
  onVerify: vi.fn(),
  onExpire: vi.fn(),
};

beforeEach(async () => {
  vi.clearAllMocks();
  await i18n.init({
    lng: "he-IL",
    fallbackLng: "en-US",
    resources: { "en-US": english, "he-IL": hebrew },
  });
});
afterEach(cleanup);

describe("authentication error presentation", () => {
  it("preserves the guest access error code for Hebrew translation and resets captcha", async () => {
    mocks.anonymous.mockResolvedValue({
      error: {
        code: "GUEST_ACCESS_DISABLED",
        message: "Guest access is disabled",
        status: 403,
      },
    });
    const onSuccess = vi.fn();
    const { result } = renderHook(() => useGuestSignIn(captcha, onSuccess));
    await act(async () => result.current.signIn());

    expect(mocks.error).toHaveBeenCalledWith(
      hebrew.common.apiErrors.guestDisabled,
    );
    expect(captcha.reset).toHaveBeenCalledOnce();
    expect(onSuccess).not.toHaveBeenCalled();
    expect(result.current.isPending).toBe(false);
  });

  it("localizes a provider rejection without exposing its English details", async () => {
    mocks.social.mockResolvedValue({
      error: { code: "PROVIDER_NOT_FOUND", message: "Provider lookup failure" },
    });
    const { result } = renderHook(() =>
      useProviderSignIn({
        callbackURL: "/dashboard",
        errorCallbackURL: "/auth/sign-in",
        captcha,
        getName: () => "Google",
      }),
    );
    await act(async () => {
      expect(await result.current.signIn("google")).toBe(false);
    });

    expect(mocks.error).toHaveBeenCalledWith(
      hebrew.common.apiErrors.providerUnavailable,
    );
    expect(captcha.reset).toHaveBeenCalledOnce();
    expect(result.current.pending).toBeNull();
  });

  it("uses the localized operation fallback for an unknown provider exception", async () => {
    mocks.oauth2.mockRejectedValue(new Error("Upstream opaque private detail"));
    const { result } = renderHook(() =>
      useProviderSignIn({
        callbackURL: "/dashboard",
        errorCallbackURL: "/auth/sign-in",
        captcha,
        getName: () => "SSO",
      }),
    );
    await act(async () => {
      await result.current.signIn("custom");
    });
    expect(mocks.error).toHaveBeenCalledWith(
      i18n.t("auth:providers.error", { provider: "SSO" }),
    );
    expect(mocks.error).not.toHaveBeenCalledWith(
      "Upstream opaque private detail",
    );
  });
});
