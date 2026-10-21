import { DirectionProvider } from "@base-ui/react/direction-provider";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vite-plus/test";
import { Calendar } from "./calendar";
import { Input } from "./input";
import { Sheet, SheetDescription, SheetPopup, SheetTitle } from "./sheet";
import { Textarea } from "./textarea";
import { Sidebar, SidebarProvider, SidebarTrigger } from "./sidebar";

const locale = vi.hoisted(() => ({
  language: "he-IL",
  resolvedLanguage: "he-IL",
}));
const mobile = vi.hoisted(() => ({ value: false }));
vi.mock("@/hooks/use-mobile", () => ({ useIsMobile: () => mobile.value }));
vi.mock("@/lib/shortcuts/use-shortcut", () => ({
  useShortcut: () => undefined,
}));
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ i18n: locale, t: (key: string) => key }),
}));
vi.mock("@/lib/i18n", () => ({ i18n: { t: (key: string) => key } }));

afterEach(() => {
  cleanup();
  locale.language = "he-IL";
  locale.resolvedLanguage = "he-IL";
  mobile.value = false;
});

it.each(["rtl", "ltr"] as const)(
  "places desktop and mobile navigation at inline-start in %s",
  async (direction) => {
    const content = (
      <DirectionProvider direction={direction}>
        <SidebarProvider>
          <Sidebar>Navigation</Sidebar>
          <SidebarTrigger />
        </SidebarProvider>
      </DirectionProvider>
    );
    const { container, unmount } = render(content);
    const side = direction === "rtl" ? "right" : "left";
    expect(container.querySelector("[data-slot=sidebar]")).toHaveAttribute(
      "data-side",
      side,
    );
    unmount();
    mobile.value = true;
    render(content);
    fireEvent.click(
      screen.getByRole("button", { name: "common:a11y.toggleSidebar" }),
    );
    expect(await screen.findByRole("dialog")).toHaveAttribute(
      "data-side",
      side,
    );
  },
);

it.each([true, false])(
  "lets free text choose its direction, with nativeInput=%s",
  (nativeInput) => {
    render(
      <>
        <Input aria-label="Title" nativeInput={nativeInput} />
        <Input aria-label="Email" type="email" nativeInput={nativeInput} />
        <Input aria-label="Override" dir="rtl" nativeInput={nativeInput} />
        <Textarea aria-label="Details" />
      </>,
    );
    expect(screen.getByLabelText("Title")).toHaveAttribute("dir", "auto");
    expect(screen.getByLabelText("Email")).toHaveAttribute("dir", "ltr");
    expect(screen.getByLabelText("Override")).toHaveAttribute("dir", "rtl");
    expect(screen.getByLabelText("Details")).toHaveAttribute("dir", "auto");
  },
);

it.each(["rtl", "ltr"] as const)(
  "places the default sheet at inline-end in %s",
  (direction) => {
    render(
      <DirectionProvider direction={direction}>
        <Sheet open>
          <SheetPopup>
            <SheetTitle>Task</SheetTitle>
            <SheetDescription>Details</SheetDescription>
          </SheetPopup>
        </Sheet>
      </DirectionProvider>,
    );
    expect(screen.getByRole("dialog")).toHaveAttribute(
      "data-side",
      direction === "rtl" ? "left" : "right",
    );
  },
);

it.each([undefined, "after", "around"] as const)(
  "renders a Hebrew calendar with RTL-aware arrows in %s navigation",
  (navLayout) => {
    const { container } = render(
      <Calendar month={new Date(2026, 9, 1)} navLayout={navLayout} />,
    );
    expect(container.querySelector("[data-slot=calendar]")).toHaveAttribute(
      "dir",
      "rtl",
    );
    expect(screen.getByText("אוקטובר 2026")).toBeTruthy();
    expect(
      screen
        .getByRole("button", { name: "עבור לחודש הקודם" })
        .querySelector(".lucide-chevron-right"),
    ).toBeTruthy();
    expect(
      screen
        .getByRole("button", { name: "עבור לחודש הבא" })
        .querySelector(".lucide-chevron-left"),
    ).toBeTruthy();
  },
);

it("retains the English calendar and LTR direction", () => {
  locale.language = "en-US";
  locale.resolvedLanguage = "en-US";
  const { container } = render(<Calendar month={new Date(2026, 9, 1)} />);
  expect(container.querySelector("[data-slot=calendar]")).toHaveAttribute(
    "dir",
    "ltr",
  );
  expect(screen.getByText("October 2026")).toBeTruthy();
});
