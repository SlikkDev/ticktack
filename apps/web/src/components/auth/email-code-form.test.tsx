import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, expect, it, vi } from "vite-plus/test";
import { EmailCodeForm } from "./email-code-form";

const mocks = vi.hoisted(() => ({ send: vi.fn(), locale: "he-IL" }));
vi.mock("@/lib/auth-client", () => ({
  authClient: { emailOtp: { sendVerificationOtp: mocks.send } },
}));
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { resolvedLanguage: mocks.locale },
  }),
}));
vi.mock("@/components/auth/auth-captcha", () => ({ AuthCaptcha: () => null }));
vi.mock("@/lib/toast", () => ({ toast: { error: vi.fn() } }));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

it.each(["he-IL", "en-US"])(
  "sends the selected %s locale alongside the CAPTCHA token",
  async (locale) => {
    mocks.locale = locale;
    mocks.send.mockResolvedValue({ error: null });
    const onSent = vi.fn();
    const reset = vi.fn();
    render(
      <EmailCodeForm
        withName
        onSent={onSent}
        captcha={{
          siteKey: undefined,
          key: 0,
          pending: false,
          headers: { "x-turnstile-token": "captcha-token" },
          onVerify: vi.fn(),
          onExpire: vi.fn(),
          reset,
        }}
      />,
    );
    fireEvent.change(screen.getByLabelText("auth:forms.name"), {
      target: { value: "שלום" },
    });
    fireEvent.change(screen.getByLabelText("auth:forms.email"), {
      target: { value: "new@example.test" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "auth:forms.continueWithEmail" }),
    );
    await waitFor(() =>
      expect(mocks.send).toHaveBeenCalledWith(
        { email: "new@example.test", type: "sign-in" },
        {
          headers: {
            "x-turnstile-token": "captcha-token",
            "x-ticktack-locale": locale,
          },
        },
      ),
    );
    expect(onSent).toHaveBeenCalledWith({
      email: "new@example.test",
      name: "שלום",
    });
    expect(reset).toHaveBeenCalledOnce();
  },
);
