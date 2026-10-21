import { randomUUID } from "node:crypto";
import { expect, test, type Locator, type Page } from "@playwright/test";
import en from "../../i18n/en-US.json" with { type: "json" };
import he from "../../i18n/he-IL.json" with { type: "json" };

test.use({ reducedMotion: "reduce" });
test.beforeEach(async ({ context, baseURL }) => {
  if (new URL(baseURL!).hostname !== "localhost") {
    test.skip(true, "Synthetic schedule acceptance only runs on localhost");
  }
  await context.route("**/*", (route) =>
    new URL(route.request().url()).hostname === "localhost"
      ? route.continue()
      : route.abort(),
  );
});

async function fixture(page: Page, locale: "he-IL" | "en-US") {
  const origin = new URL(test.info().project.use.baseURL!).origin;
  const post = async (path: string, data: object) => {
    const response = await page.request.post(`/api/${path}`, {
      headers: { Origin: origin },
      data,
    });
    await expect(response).toBeOK();
    return response.json();
  };
  const suffix = randomUUID();
  await post("auth/sign-up/email", {
    name: "Synthetic schedule acceptance",
    email: `schedule-${suffix}@example.com`,
    password: `Synthetic-${randomUUID()}`,
  });
  await post("auth/update-user", { locale });
  const workspace = await post("auth/organization/create", {
    name: "Synthetic schedule acceptance",
    slug: `schedule-${suffix}`,
  });
  await post("auth/organization/set-active", { organizationId: workspace.id });
  const project = await post("project", {
    name: "בדיקת לוח Schedule acceptance",
    slug: "SCHEDULE",
    icon: "Check",
    workspaceId: workspace.id,
  });
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const day = (delta: number) =>
    new Date(today.getTime() + delta * 86_400_000).toISOString().slice(0, 10);
  const task = await post(`task/${project.id}`, {
    title: "משימה Task acceptance",
    description: "",
    priority: "medium",
    status: "to-do",
    startDate: `${day(-2)}T00:00:00.000Z`,
    dueDate: `${day(2)}T00:00:00.000Z`,
  });
  return {
    task,
    day,
    url: `/dashboard/workspace/${workspace.id}/project/${project.id}`,
    catalog: locale === "he-IL" ? he : en,
  };
}

async function taskState(page: Page, id: string) {
  const response = await page.request.get(`/api/task/${id}`);
  await expect(response).toBeOK();
  return response.json();
}
async function persistedDates(page: Page, id: string, expected: string[]) {
  const dates = async () => {
    const task = await taskState(page, id);
    return [task.startDate, task.dueDate].map((date: string) =>
      date.slice(0, 10),
    );
  };
  await expect.poll(dates).toEqual(expected);
  await page.reload();
  await expect(page.getByTestId("gantt-scroll-container")).toBeVisible();
  expect(await dates()).toEqual(expected);
}
async function mouseDrag(page: Page, target: Locator, dx: number) {
  await target.scrollIntoViewIfNeeded();
  const box = (await target.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + dx, box.y + box.height / 2, {
    steps: 12,
  });
  await page.mouse.up();
}

for (const locale of ["he-IL", "en-US"] as const) {
  test(`${locale} board and Gantt pointer and keyboard changes persist`, async ({
    page,
  }) => {
    const { task, day, url, catalog } = await fixture(page, locale);
    const sign = locale === "he-IL" ? -1 : 1;
    const forward = sign === -1 ? "ArrowLeft" : "ArrowRight";
    const backward = sign === -1 ? "ArrowRight" : "ArrowLeft";
    await page.goto(`${url}/board`);
    await expect(page.locator("html")).toHaveAttribute(
      "dir",
      sign === -1 ? "rtl" : "ltr",
    );
    const card = page.locator(`[data-task-id="${task.id}"]`);
    const nextColumn = page.locator('[data-column-id="in-progress"]');
    await expect(card).toBeVisible();
    const source = (await card.boundingBox())!;
    const target = (await nextColumn.boundingBox())!;
    expect(Math.sign(target.x - source.x)).toBe(sign);
    await page.mouse.move(
      source.x + source.width / 2,
      source.y + source.height / 2,
    );
    await page.mouse.down();
    await page.mouse.move(target.x + target.width / 2, target.y + 110, {
      steps: 20,
    });
    await page.mouse.up();
    const status = async (expected: string) => {
      await expect
        .poll(async () => (await taskState(page, task.id)).status)
        .toBe(expected);
      await page.reload();
      await expect(card).toBeVisible();
      expect((await taskState(page, task.id)).status).toBe(expected);
      await expect(
        page
          .locator(`[data-column-id="${expected}"]`)
          .locator(`[data-task-id="${task.id}"]`),
      ).toBeVisible();
    };
    await status("in-progress");
    await card.focus();
    await page.keyboard.press(`Alt+${forward}`);
    await status("in-review");
    await card.focus();
    await page.keyboard.press(`Alt+${backward}`);
    await status("in-progress");

    await page.goto(`${url}/gantt`);
    const move = page.getByRole("button", {
      name: catalog.tasks.gantt.taskAriaLabel.replace("{{title}}", task.title),
      exact: true,
    });
    const start = page.getByRole("button", {
      name: catalog.tasks.gantt.resizeStart,
      exact: true,
    });
    const end = page.getByRole("button", {
      name: catalog.tasks.gantt.resizeDue,
      exact: true,
    });
    await expect(move).toBeVisible();
    await mouseDrag(page, move, sign * 44);
    await persistedDates(page, task.id, [day(-1), day(3)]);
    await mouseDrag(page, move, -sign * 44);
    await persistedDates(page, task.id, [day(-2), day(2)]);
    await mouseDrag(page, start, sign * 44);
    await persistedDates(page, task.id, [day(-1), day(2)]);
    await mouseDrag(page, end, sign * 44);
    await persistedDates(page, task.id, [day(-1), day(3)]);
    await move.focus();
    await page.keyboard.press(forward);
    await persistedDates(page, task.id, [day(0), day(4)]);
    await start.focus();
    await page.keyboard.press(backward);
    await persistedDates(page, task.id, [day(-1), day(4)]);
    await end.focus();
    await page.keyboard.press(backward);
    await persistedDates(page, task.id, [day(-1), day(3)]);
  });
}

test.describe("Hebrew phone touch schedule", () => {
  test.use({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  test("native touch drag and both resize handles persist", async ({
    page,
    context,
    browserName,
  }) => {
    test.skip(
      browserName !== "chromium",
      "Native touch sequences require Chromium CDP",
    );
    const { task, day, url, catalog } = await fixture(page, "he-IL");
    await page.goto(`${url}/gantt`);
    const move = page.getByRole("button", {
      name: catalog.tasks.gantt.taskAriaLabel.replace("{{title}}", task.title),
      exact: true,
    });
    const start = page.getByRole("button", {
      name: catalog.tasks.gantt.resizeStart,
      exact: true,
    });
    const end = page.getByRole("button", {
      name: catalog.tasks.gantt.resizeDue,
      exact: true,
    });
    await expect(move).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(390);
    const cdp = await context.newCDPSession(page);
    const touchDrag = async (target: Locator, dx: number) => {
      const box = (await target.boundingBox())!;
      const x = box.x + box.width / 2;
      const y = box.y + box.height / 2;
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [{ x, y, radiusX: 4, radiusY: 4, force: 1 }],
      });
      for (let step = 1; step <= 8; step++) {
        await cdp.send("Input.dispatchTouchEvent", {
          type: "touchMove",
          touchPoints: [
            { x: x + (dx * step) / 8, y, radiusX: 4, radiusY: 4, force: 1 },
          ],
        });
        await page.waitForTimeout(20);
      }
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchEnd",
        touchPoints: [],
      });
    };
    await touchDrag(move, -50);
    await persistedDates(page, task.id, [day(-1), day(3)]);
    await touchDrag(move, 50);
    await persistedDates(page, task.id, [day(-2), day(2)]);
    await touchDrag(start, -50);
    await persistedDates(page, task.id, [day(-1), day(2)]);
    await touchDrag(end, -50);
    await persistedDates(page, task.id, [day(-1), day(3)]);
    await cdp.detach();
  });
});
