import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import {
  chromium,
  expect,
} from "../../tests/e2e/node_modules/@playwright/test/index.mjs";

const baseURL = "http://localhost:18173";
const runName =
  process.env.MOBILE_RUN || new Date().toISOString().replace(/[:.]/g, "-");
const output = new URL(
  `../../.cache/mobile-acceptance/${runName}/`,
  import.meta.url,
);
const he = JSON.parse(
  await readFile(new URL("../../i18n/he-IL.json", import.meta.url), "utf8"),
);
const en = JSON.parse(
  await readFile(new URL("../../i18n/en-US.json", import.meta.url), "utf8"),
);
const text = (catalog, path) =>
  path.split(/[.:]/).reduce((value, part) => value[part], catalog);
const evidence = {
  startedAt: new Date().toISOString(),
  viewport: { width: 390, height: 844 },
  buildNote:
    process.env.MOBILE_BUILD_NOTE ||
    "Awaiting parent build timestamp confirmation.",
  checks: [],
  blockedExternalOrigins: [],
  pageErrors: [],
  focusTraces: {},
};
const browser = await chromium.launch({
  headless: true,
  args: ["--disable-background-networking"],
});
const context = await browser.newContext({
  baseURL,
  viewport: evidence.viewport,
  isMobile: true,
  hasTouch: true,
  locale: "he-IL",
  reducedMotion: "reduce",
  serviceWorkers: "block",
});
await context.route("**/*", async (route) => {
  const url = new URL(route.request().url());
  if (["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) {
    return route.continue();
  }
  evidence.blockedExternalOrigins.push(url.origin);
  await route.abort("blockedbyclient");
});
await context.routeWebSocket("**/*", (socket) => {
  const url = new URL(socket.url());
  if (["localhost", "127.0.0.1", "[::1]"].includes(url.hostname))
    socket.connectToServer();
  else {
    evidence.blockedExternalOrigins.push(url.origin);
    socket.close();
  }
});
const page = await context.newPage();
page.on("pageerror", (error) => evidence.pageErrors.push(error.message));
page.setDefaultTimeout(12000);
await mkdir(output, { recursive: true });

async function api(method, path, data) {
  const response = await context.request.fetch(`/api/${path}`, {
    method,
    data,
    headers: { Origin: baseURL },
    maxRedirects: 0,
  });
  if (!response.ok())
    throw new Error(`Local API ${method} ${path}: HTTP ${response.status()}`);
  return response.json();
}
async function screenshot(name) {
  await page.screenshot({
    path: new URL(`${name}.png`, output).pathname,
    fullPage: true,
  });
}
async function noOverflow() {
  const size = await page.evaluate(() => ({
    viewport: window.innerWidth,
    client: document.documentElement.clientWidth,
    scroll: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
  }));
  expect(size.scroll).toBeLessThanOrEqual(size.client + 1);
  expect(size.body).toBeLessThanOrEqual(size.client + 1);
  return size;
}
async function check(name, run) {
  try {
    const details = await run();
    evidence.checks.push({ name, status: "passed", details });
    console.log(`PASS ${name}`);
  } catch (error) {
    const focus = await page.evaluate(() => ({
      tag: document.activeElement?.tagName,
      role: document.activeElement?.getAttribute("role"),
      slot: document.activeElement?.getAttribute("data-slot"),
      guard: document.activeElement?.getAttribute("data-base-ui-focus-guard"),
      text: document.activeElement?.textContent?.slice(0, 180),
    }));
    evidence.checks.push({
      name,
      status: "failed",
      error: error.message,
      focus,
    });
    console.log(`FAIL ${name}: ${error.message.slice(0, 400)}`);
    await screenshot(`failure-${name.replace(/[^a-z0-9-]/gi, "-")}`).catch(
      () => {},
    );
    if (await page.getByRole("dialog").count())
      await page.keyboard.press("Escape");
  }
}
async function tabWithin(container, count, name) {
  evidence.focusTraces[name] = [];
  for (let index = 0; index < count; index++) {
    await page.keyboard.press("Tab");
    await expect
      .poll(
        async () => {
          const focus = await container.evaluate((node) => ({
            inside: node.contains(document.activeElement),
            tag: document.activeElement?.tagName,
            role: document.activeElement?.getAttribute("role"),
            guard: document.activeElement?.getAttribute(
              "data-base-ui-focus-guard",
            ),
            text: document.activeElement?.textContent?.slice(0, 100),
          }));
          evidence.focusTraces[name].push({ index, ...focus });
          return focus.inside;
        },
        {
          message: `${name} Tab ${index + 1} keeps focus inside`,
          timeout: 2000,
        },
      )
      .toBe(true);
  }
}

try {
  await page.goto("/auth/sign-up");
  await check("hebrew-auth-empty-natural-language-placeholder", async () => {
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    const name = page.locator('input[name="name"]');
    await expect(name).toBeVisible();
    await expect(name).toHaveValue("");
    const emptyStyle = await name.evaluate((input) => ({
      direction: getComputedStyle(input).direction,
      textAlign: getComputedStyle(input).textAlign,
      placeholder: input.getAttribute("placeholder"),
      placeholderShown: input.matches(":placeholder-shown"),
    }));
    expect(emptyStyle.direction).toBe("rtl");
    expect(["start", "right"]).toContain(emptyStyle.textAlign);
    expect(emptyStyle.placeholderShown).toBe(true);
    const email = page.locator('input[name="email"]');
    await expect(email).toHaveAttribute("dir", "ltr");
    await screenshot("00-auth-empty-placeholders-he");
    await name.fill("English Name");
    await expect(name).toHaveCSS("direction", "ltr");
    await name.clear();
    await expect(name).toHaveCSS("direction", "rtl");
    return {
      emptyStyle,
      typedEnglishDirection: "ltr",
      clearedDirection: "rtl",
      ...(await noOverflow()),
    };
  });
  const suffix = randomUUID();
  const email = `synthetic-mobile-${suffix}@example.com`;
  await api("POST", "auth/sign-up/email", {
    name: "Synthetic Mobile Tester",
    email,
    password: `Synthetic-${suffix}-Aa1!`,
  });
  const workspaceName = "synthetic בדיקת מובייל ENG";
  const projectName = "מובייל Mobile QA";
  await page.goto("/onboarding");
  await expect(page.locator("#onboarding-workspace-name")).toBeVisible();
  await check("hebrew-onboarding-workspace", async () => {
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await page.locator("#onboarding-workspace-name").fill(workspaceName);
    await screenshot("01-onboarding-workspace-he");
    return noOverflow();
  });
  await page.locator('form button[type="submit"]').click();
  await expect(page.getByRole("radio").first()).toBeVisible();
  await check("hebrew-onboarding-usage", async () => {
    await screenshot("02-onboarding-usage-he");
    return noOverflow();
  });
  await page.locator('form button[type="submit"]').click();
  await expect(page.locator("#onboarding-project-name")).toBeVisible();
  await page.locator("#onboarding-project-name").fill(projectName);
  await check("mixed-project-field-and-key", async () => {
    await expect(page.locator("#onboarding-project-name")).toHaveAttribute(
      "dir",
      "auto",
    );
    await expect(
      page.locator("#onboarding-project-key bdi").first(),
    ).toHaveAttribute("dir", "ltr");
    await screenshot("03-onboarding-project-he");
    return noOverflow();
  });
  await page.locator('form button[type="submit"]').click();
  await expect(
    page.getByRole("button", { name: new RegExp(workspaceName) }),
  ).toBeVisible();
  await screenshot("04-onboarding-ready-he");
  await page.getByRole("button", { name: new RegExp(workspaceName) }).click();
  await expect(page).toHaveURL(
    /\/dashboard\/workspace\/[^/]+\/project\/[^/]+\/board$/,
  );
  const projectId = page.url().match(/\/project\/([^/]+)/)[1];
  const workspaceId = page.url().match(/\/workspace\/([^/]+)/)[1];
  evidence.syntheticProjectId = projectId;
  await page.goto("/dashboard/settings/account/preferences");
  await expect(
    page.getByRole("heading", {
      name: text(he, "settings.preferencesPage.title"),
      exact: true,
    }),
  ).toBeVisible();
  await check("hebrew-settings-no-page-overflow", async () => {
    await screenshot("05-settings-preferences-he");
    return noOverflow();
  });
  await check("hebrew-mobile-sidebar-right-and-focus", async () => {
    const trigger = page.locator('[data-sidebar="trigger"]');
    await trigger.tap();
    const sidebar = page.locator(
      '[data-sidebar="sidebar"][data-mobile="true"]',
    );
    await expect(sidebar).toBeVisible();
    await expect
      .poll(async () => (await sidebar.boundingBox()).x)
      .toBeGreaterThan(0);
    const box = await sidebar.boundingBox();
    expect(Math.abs(box.x + box.width - 390)).toBeLessThanOrEqual(1);
    await tabWithin(sidebar, 20, "sidebar");
    await screenshot("06-settings-sidebar-right-he");
    await page.keyboard.press("Escape");
    await expect(sidebar).toBeHidden();
    await expect(trigger).toBeFocused();
    return { box, focusCycles: 20, escapeRestoresTrigger: true };
  });
  await check("hebrew-mobile-sidebar-navigation", async () => {
    await page.locator('[data-sidebar="trigger"]').tap();
    const sidebar = page.locator(
      '[data-sidebar="sidebar"][data-mobile="true"]',
    );
    await sidebar
      .getByRole("link", {
        name: text(he, "settings.information"),
        exact: true,
      })
      .tap();
    await expect(page).toHaveURL(
      /\/dashboard\/settings\/account\/information$/,
    );
    await expect(sidebar).toBeHidden();
    await expect(page.getByText(email, { exact: true })).toBeVisible();
    return noOverflow();
  });
  await check("english-switch-and-reload", async () => {
    await page.goto("/dashboard/settings/account/preferences");
    await page.getByRole("combobox", { name: /^(Language|שפה)$/ }).click();
    await page.getByRole("option", { name: "English", exact: true }).click();
    await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
    await expect(
      page.getByRole("heading", {
        name: text(en, "settings.preferencesPage.title"),
        exact: true,
      }),
    ).toBeVisible();
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
    await expect(
      page.getByRole("combobox", { name: "Language", exact: true }),
    ).toContainText("English");
    await screenshot("07-settings-preferences-en-reloaded");
    return noOverflow();
  });
  await check("english-mobile-sidebar-left", async () => {
    await page.goto("/dashboard/settings/account/preferences");
    await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
    await page.locator('[data-sidebar="trigger"]').tap();
    const sidebar = page.locator(
      '[data-sidebar="sidebar"][data-mobile="true"]',
    );
    await expect(sidebar).toBeVisible();
    await expect
      .poll(async () => (await sidebar.boundingBox()).x)
      .toBeGreaterThanOrEqual(-1);
    const box = await sidebar.boundingBox();
    expect(Math.abs(box.x)).toBeLessThanOrEqual(1);
    await screenshot("08-settings-sidebar-left-en");
    await page.keyboard.press("Escape");
    await expect(sidebar).toBeHidden();
    return { box };
  });
  await check("hebrew-switch-and-reload", async () => {
    await page.goto("/dashboard/settings/account/preferences");
    await page.getByRole("combobox", { name: /^(Language|שפה)$/ }).click();
    await page.getByRole("option", { name: "עברית", exact: true }).click();
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(
      page.getByRole("heading", {
        name: text(he, "settings.preferencesPage.title"),
        exact: true,
      }),
    ).toBeVisible();
    return noOverflow();
  });
  await page.goto(`/dashboard/settings/projects/${projectId}/general`);
  await expect(page.getByRole("textbox").first()).toBeVisible();
  await check("project-settings-mixed-fields", async () => {
    const key = page.locator('input[name="slug"]');
    await expect(key).toHaveAttribute("dir", "ltr");
    await expect(page.locator('input[name="name"]')).toHaveValue(projectName);
    await expect(page.locator('input[name="name"]')).toHaveAttribute(
      "dir",
      "auto",
    );
    await screenshot("09-project-settings-mixed-he");
    return { key: await key.inputValue(), ...(await noOverflow()) };
  });
  await page.goto("/dashboard/settings/workspace/labels");
  await check("label-dialog-mobile-focus-and-mixed-text", async () => {
    const opener = page
      .getByRole("button", {
        name: text(he, "settings.workspaceLabels.newLabel"),
        exact: true,
      })
      .first();
    await opener.tap();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    const input = dialog.getByRole("textbox").first();
    await input.fill("תגית Label-123");
    await expect(input).toHaveAttribute("dir", "auto");
    await input.focus();
    await tabWithin(dialog, 30, "label-dialog");
    const box = await dialog.boundingBox();
    expect(box.x).toBeGreaterThanOrEqual(-1);
    expect(box.x + box.width).toBeLessThanOrEqual(391);
    await screenshot("10-label-dialog-mixed-he");
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(opener).toBeFocused();
    return { box, focusCycles: 30, ...(await noOverflow()) };
  });
  await page.goto("/dashboard/settings/account/information");
  await check("profile-email-and-mobile-width", async () => {
    await expect(page.getByText(email, { exact: true })).toBeVisible();
    await expect(page.getByText(email, { exact: true })).toHaveAttribute(
      "dir",
      "ltr",
    );
    await screenshot("11-profile-email-he");
    return noOverflow();
  });
  await check("numeric-custom-field-display-and-edit-syntax", async () => {
    const fieldName = "סכום Amount";
    const field = await api("POST", "custom-field", {
      projectId,
      name: fieldName,
      type: "number",
      required: false,
    });
    const task = await api("POST", `task/${projectId}`, {
      title: "בדיקת שדה Mobile numeric QA",
      description: "Synthetic mobile acceptance only.",
      priority: "medium",
      status: "planned",
      customFields: [{ fieldId: field.id, value: "1234.56789" }],
    });
    await page.goto(
      `/dashboard/workspace/${workspaceId}/project/${projectId}/task/${task.id}`,
    );
    const chip = page.locator(`[data-custom-field="${field.id}"]`);
    await expect(chip).toBeVisible();
    await expect(chip).toContainText("1,234.56789");
    await expect(chip.locator('bdi[dir="ltr"]').first()).toHaveText(
      "1,234.56789",
    );
    await screenshot("12-numeric-custom-field-he");
    await chip.click();
    const editor = page.getByRole("spinbutton", {
      name: fieldName,
      exact: true,
    });
    await expect(editor).toHaveValue("1234.56789");
    await expect(editor).toHaveAttribute("dir", "ltr");
    const popup = page.locator('[data-slot="popover-popup"]');
    await expect(popup).toBeVisible();
    await expect(popup).toHaveCSS("opacity", "1");
    const box = await popup.boundingBox();
    expect(box.x).toBeGreaterThanOrEqual(-1);
    expect(box.x + box.width).toBeLessThanOrEqual(391);
    await screenshot("13-numeric-field-editor-he");
    await page.keyboard.press("Escape");
    await expect(editor).toBeHidden();
    await expect(chip).toContainText("1,234.56789");
    return {
      display: "1,234.56789",
      rawEditValue: "1234.56789",
      popoverBox: box,
      ...(await noOverflow()),
    };
  });
  evidence.finalUrl = page.url();
} catch (error) {
  evidence.setupFailure = error.message;
  console.log(`SETUP FAILURE ${error.message.slice(0, 500)}`);
  await screenshot("setup-failure").catch(() => {});
  await writeFile(
    new URL("last-page.txt", output),
    await page
      .locator("body")
      .innerText()
      .catch(() => ""),
  );
} finally {
  evidence.finishedAt = new Date().toISOString();
  evidence.blockedExternalOrigins = [
    ...new Set(evidence.blockedExternalOrigins),
  ];
  await writeFile(
    new URL("results.json", output),
    JSON.stringify(evidence, null, 2),
  );
  await context.close();
  await browser.close();
}
if (
  evidence.setupFailure ||
  evidence.checks.some((check) => check.status === "failed")
)
  process.exitCode = 1;
