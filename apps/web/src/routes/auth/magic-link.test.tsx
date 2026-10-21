import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import type { ComponentType, ReactNode } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vite-plus/test";
const m = vi.hoisted(() => ({
  post: vi.fn(),
  refresh: vi.fn(),
  navigate: vi.fn(),
  clear: vi.fn(),
}));
vi.mock("@kaneo/libs", () => ({
  client: { auth: { "magic-link": { confirm: { $post: m.post } } } },
}));
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: unknown) => ({ options }),
  useNavigate: () => m.navigate,
}));
vi.mock("@/components/providers/auth-provider/hooks/use-auth", () => ({
  useAuth: () => ({ refetchUser: m.refresh }),
}));
vi.mock("@/lib/magic-link-fragment", () => ({
  readMagicLinkFragment: () => ({
    token: "synthetic-token",
    destination: "/dashboard",
  }),
  clearMagicLinkFragment: m.clear,
}));
vi.mock("@/components/auth/auth-page", () => ({
  AuthPage: ({ children }: { children: ReactNode }) => <main>{children}</main>,
}));
vi.mock("@/components/page-title", () => ({ default: () => null }));
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
const { Route } = await import("./magic-link");
afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
  m.post.mockResolvedValue({ ok: true });
  m.refresh.mockResolvedValue(undefined);
});
it("requires an explicit click and refreshes session state before navigation", async () => {
  let release!: () => void;
  m.refresh.mockReturnValue(
    new Promise<void>((resolve) => {
      release = resolve;
    }),
  );
  render(<Page />);
  expect(m.post).not.toHaveBeenCalled();
  fireEvent.click(
    screen.getByRole("button", { name: "auth:passwordless.confirm" }),
  );
  await waitFor(() => expect(m.refresh).toHaveBeenCalledTimes(1));
  expect(m.clear).toHaveBeenCalledTimes(1);
  expect(m.navigate).not.toHaveBeenCalled();
  release();
  await waitFor(() =>
    expect(m.navigate).toHaveBeenCalledWith({ to: "/dashboard" }),
  );
});
it("does not change the session or navigate after failed confirmation", async () => {
  m.post.mockResolvedValue({ ok: false });
  render(<Page />);
  fireEvent.click(
    screen.getByRole("button", { name: "auth:passwordless.confirm" }),
  );
  await screen.findByRole("alert");
  expect(m.refresh).not.toHaveBeenCalled();
  expect(m.navigate).not.toHaveBeenCalled();
});
const Page = Route.options.component as ComponentType;
