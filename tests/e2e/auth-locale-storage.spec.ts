import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import en from "../../i18n/en-US.json" with { type: "json" };

test("English signup keeps the selected account language when local storage is blocked", async ({
  page,
  context,
  baseURL,
}) => {
  test.skip(
    new URL(baseURL!).hostname !== "localhost",
    "Synthetic localhost account only",
  );
  await context.route("**/*", (route) =>
    new URL(route.request().url()).hostname === "localhost"
      ? route.continue()
      : route.abort(),
  );
  await context.routeWebSocket("**/*", (socket) => {
    if (new URL(socket.url()).hostname === "localhost")
      socket.connectToServer();
    else socket.close();
  });
  await context.addInitScript(() => {
    for (const key of ["getItem", "setItem"]) {
      Object.defineProperty(Storage.prototype, key, {
        value() {
          throw new DOMException(
            "Storage blocked for acceptance test",
            "SecurityError",
          );
        },
      });
    }
  });
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.goto("/auth/sign-up");
  await page.getByRole("combobox").selectOption("en-US");
  await expect(page.locator("html")).toHaveAttribute("lang", "en-US");
  await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
  await page
    .getByLabel(en.auth.forms.name, { exact: true })
    .fill("Synthetic locale test");
  await page
    .getByLabel(en.auth.forms.email, { exact: true })
    .fill(`locale-${randomUUID()}@example.com`);
  await page
    .getByLabel(en.auth.forms.password, { exact: true })
    .fill(`Synthetic-only-${randomUUID()}`);
  await page
    .getByRole("button", { name: en.auth.signUp.submitPassword, exact: true })
    .click();
  await expect(page).toHaveURL(/\/onboarding$/);
  const session = await context.request.get("/api/auth/get-session");
  await expect(session).toBeOK();
  expect((await session.json()).user.locale).toBe("en-US");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "en-US");
  expect(pageErrors).toEqual([]);
});
