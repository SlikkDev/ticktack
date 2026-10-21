import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { chromium, expect } from "./node_modules/@playwright/test/index.mjs";

export const baseURL = "http://localhost:18173";
export const output = new URL(
  "../../.cache/editor-acceptance/",
  import.meta.url,
);
export const imageURL = `${baseURL}/__editor-acceptance-image.svg`;
export const markdown = [
  "שלום עולם English TICK-123",
  "",
  "English paragraph שלום https://localhost:18173/path?id=123",
  "",
  "## כותרת מעורבת Mixed heading",
  "",
  "- [ ] משימה ראשונה Checklist",
  "- [ ] English checklist שני",
  "",
  "| כותרת ימין | English left |",
  "| --- | --- |",
  "| אבג | XYZ |",
  "| | |",
  "",
  '```javascript\nconst greeting = "שלום";\nconsole.log(greeting);\n```',
  "",
  "[קישור Local docs](http://localhost:18173/__editor-acceptance-link?item=123)",
  "",
  `<img src="${imageURL}" alt="תמונה מקומית Synthetic image" width="240" />`,
  "",
  "סיום End",
].join("\n");

export async function restrict(context, evidence = {}) {
  evidence.blockedExternalOrigins ??= [];
  const local = (url) =>
    ["localhost", "127.0.0.1", "[::1]"].includes(new URL(url).hostname);
  await context.route("**/*", async (route) => {
    if (!local(route.request().url())) {
      evidence.blockedExternalOrigins.push(
        new URL(route.request().url()).origin,
      );
      return route.abort("blockedbyclient");
    }
    if (route.request().url() === imageURL)
      return route.fulfill({
        contentType: "image/svg+xml",
        body: '<svg xmlns="http://www.w3.org/2000/svg" width="480" height="240" viewBox="0 0 480 240"><rect width="480" height="240" fill="#155e75"/><rect x="20" y="20" width="440" height="200" fill="#cffafe"/><circle cx="240" cy="120" r="65" fill="#0e7490"/></svg>',
      });
    return route.continue();
  });
  await context.routeWebSocket("**/*", (socket) => {
    if (local(socket.url())) socket.connectToServer();
    else {
      evidence.blockedExternalOrigins.push(new URL(socket.url()).origin);
      socket.close();
    }
  });
}

export async function api(context, method, path, data) {
  const response = await context.request.fetch(`${baseURL}/api/${path}`, {
    method,
    data,
    headers: { Origin: baseURL },
    maxRedirects: 0,
  });
  if (!response.ok())
    throw new Error(`${method} ${path}: HTTP ${response.status()}`);
  return response.json();
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  await mkdir(output, { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    args: ["--disable-background-networking"],
  });
  const context = await browser.newContext({
    baseURL,
    locale: "he-IL",
    viewport: { width: 1440, height: 1000 },
    reducedMotion: "reduce",
    serviceWorkers: "block",
  });
  const evidence = { pageErrors: [], blockedExternalOrigins: [] };
  await restrict(context, evidence);
  const page = await context.newPage();
  page.on("pageerror", (error) => evidence.pageErrors.push(error.message));
  page.setDefaultTimeout(15000);
  try {
    const id = randomUUID();
    await api(context, "POST", "auth/sign-up/email", {
      name: "בודק עורך Synthetic",
      email: `synthetic-editor-${id}@example.com`,
      password: `Synthetic-only-${id}-Aa1!`,
      locale: "he-IL",
    });
    const he = JSON.parse(
      await readFile(new URL("../../i18n/he-IL.json", import.meta.url), "utf8"),
    );
    await page.goto("/onboarding");
    await page
      .locator("#onboarding-workspace-name")
      .fill("סביבת עורך Synthetic QA");
    await page
      .getByRole("button", { name: he.auth.onboarding.continue, exact: true })
      .click();
    await expect(page.getByRole("radio").first()).toBeVisible();
    await page
      .getByRole("button", { name: he.auth.onboarding.continue, exact: true })
      .click();
    await page.locator("#onboarding-project-name").fill("עורך Editor QA");
    await page
      .getByRole("button", { name: he.auth.onboarding.continue, exact: true })
      .click();
    await page
      .getByRole("button", {
        name: he.auth.onboarding.ready.open.replace(
          "{{name}}",
          "סביבת עורך Synthetic QA",
        ),
        exact: true,
      })
      .click();
    await expect(page).toHaveURL(/\/project\/[^/]+\/board$/);
    const boardURL = page.url();
    const projectId = boardURL.match(/\/project\/([^/]+)/)[1];
    const workspaceId = boardURL.match(/\/workspace\/([^/]+)/)[1];
    const board = await api(context, "GET", `task/tasks/${projectId}`);
    const task = await api(context, "POST", `task/${projectId}`, {
      title: "בדיקת עורך Editor TICK-123",
      description: markdown,
      status: board.data.columns[0].slug,
      priority: "no-priority",
    });
    const taskURL = `${baseURL}/dashboard/workspace/${workspaceId}/project/${projectId}/task/${task.id}`;
    await page.goto(taskURL);
    await expect(
      page.locator('[data-task-action="description"] .ProseMirror'),
    ).toBeVisible();
    await expect(
      page.locator('[data-task-action="description"] .ProseMirror'),
    ).toHaveAttribute("contenteditable", "true");
    await context.storageState({
      path: new URL("storage.json", output).pathname,
    });
    await writeFile(
      new URL("fixture.json", output),
      JSON.stringify(
        { taskURL, taskId: task.id, projectId, workspaceId, evidence },
        null,
        2,
      ),
    );
    await writeFile(
      new URL("initial-editor.html", output),
      await page
        .locator('[data-task-action="description"]')
        .evaluate((node) => node.outerHTML),
    );
    await page.screenshot({
      path: new URL("00-initial-desktop.png", output).pathname,
      fullPage: true,
    });
    console.log(
      JSON.stringify(
        {
          status: "ready",
          taskURL,
          pageErrors: evidence.pageErrors,
          editorText: await page
            .locator('[data-task-action="description"]')
            .innerText(),
        },
        null,
        2,
      ),
    );
  } catch (error) {
    await writeFile(
      new URL("bootstrap-failure.txt", output),
      `${error.stack}\n${await page.locator("body").innerText()}`,
    );
    await page.screenshot({
      path: new URL("bootstrap-failure.png", output).pathname,
      fullPage: true,
    });
    throw error;
  } finally {
    await browser.close();
  }
}
