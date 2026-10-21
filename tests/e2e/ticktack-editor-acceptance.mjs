import { readFile, writeFile, mkdir } from "node:fs/promises";
import { chromium, expect } from "./node_modules/@playwright/test/index.mjs";
import {
  baseURL,
  output,
  restrict,
  api,
  markdown,
} from "./editor-fixtures.mjs";

const fixture = JSON.parse(
  await readFile(new URL("fixture.json", output), "utf8"),
);
const he = JSON.parse(
  await readFile(new URL("../../i18n/he-IL.json", import.meta.url), "utf8"),
);
const resultDir = new URL(`${process.env.EDITOR_RUN ?? "initial"}/`, output);
await mkdir(resultDir, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  args: ["--disable-background-networking"],
});
const context = await browser.newContext({
  baseURL,
  storageState: new URL("storage.json", output).pathname,
  viewport: { width: 1440, height: 1000 },
  locale: "he-IL",
  reducedMotion: "reduce",
  serviceWorkers: "block",
});
const evidence = {
  startedAt: new Date().toISOString(),
  checks: [],
  blockedExternalOrigins: [],
  pageErrors: [],
  note: "Local synthetic account/task only; no email, invitations or remote navigation. Image source fulfilled locally in browser.",
};
await restrict(context, evidence);
const page = await context.newPage();
page.setDefaultTimeout(7000);
page.on("pageerror", (error) => evidence.pageErrors.push(error.message));
const editor = page.locator('[data-task-action="description"] .ProseMirror');
const shell = page.locator('[data-task-action="description"]');
const comment = page.locator('[data-task-action="comment"] .ProseMirror');
async function screenshot(name) {
  await page.screenshot({
    path: new URL(`${name}.png`, resultDir).pathname,
    fullPage: true,
  });
}
async function load(width = 1440, height = 1000, description = markdown) {
  // Discard the previous editor before resetting the fixture, so its pending
  // autosave cannot race the next case's API reset.
  await page.goto("about:blank");
  await page.setViewportSize({ width, height });
  await api(context, "PUT", `task/description/${fixture.taskId}`, {
    description,
  });
  await page.goto(fixture.taskURL);
  await expect(editor).toHaveAttribute("contenteditable", "true");
  await expect(editor.locator("table")).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
}
async function check(name, run) {
  try {
    const details = await run();
    evidence.checks.push({ name, status: "passed", details });
    console.log(`PASS ${name}`);
  } catch (error) {
    evidence.checks.push({ name, status: "failed", error: error.message });
    console.log(`FAIL ${name}: ${error.message.slice(0, 500)}`);
    await screenshot(`failure-${name}`).catch(() => {});
  }
  await writeFile(
    new URL("results.json", resultDir),
    JSON.stringify(evidence, null, 2),
  );
}
async function savedDescription() {
  return (await api(context, "GET", `task/${fixture.taskId}`)).description;
}
async function caret(locator, edge = "end") {
  await locator.scrollIntoViewIfNeeded();
  await locator.evaluate((node, edge) => {
    node.closest('[contenteditable="true"]').focus();
    const range = document.createRange();
    range.selectNodeContents(node);
    range.collapse(edge === "start");
    const selection = getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  }, edge);
}
async function selectedCellIndex() {
  return page.evaluate(() => {
    const node = getSelection()?.anchorNode;
    const cell = (
      node instanceof Element ? node : node?.parentElement
    )?.closest("td,th");
    return cell ? [...cell.parentElement.children].indexOf(cell) : -1;
  });
}
async function selectedCellCaret() {
  return page.evaluate(() => {
    const selection = getSelection();
    const node = selection?.anchorNode;
    const cell = (
      node instanceof Element ? node : node?.parentElement
    )?.closest("td,th");
    if (!cell || !selection) return null;
    const range = document.createRange();
    range.selectNodeContents(cell);
    range.setEnd(node, selection.anchorOffset);
    return {
      cell: [...cell.parentElement.children].indexOf(cell),
      offset: range.toString().length,
    };
  });
}
async function viewportBox(locator) {
  await expect(locator).toBeVisible();
  const box = await locator.boundingBox();
  const size = page.viewportSize();
  expect(box.x).toBeGreaterThanOrEqual(-1);
  expect(box.y).toBeGreaterThanOrEqual(-1);
  expect(box.x + box.width).toBeLessThanOrEqual(size.width + 1);
  expect(box.y + box.height).toBeLessThanOrEqual(size.height + 1);
  return box;
}

try {
  await check("desktop-mixed-paragraphs-code-and-links", async () => {
    await load();
    const directions = await editor.evaluate((node) =>
      [...node.children]
        .filter((item) => ["P", "H2", "PRE"].includes(item.tagName))
        .map((item) => ({
          tag: item.tagName,
          text: item.textContent,
          direction: getComputedStyle(item).direction,
        })),
    );
    expect(directions[0].direction).toBe("rtl");
    expect(directions[1].direction).toBe("ltr");
    expect(directions.find((item) => item.tag === "PRE").direction).toBe("ltr");
    expect(
      await editor
        .locator("code")
        .evaluate((node) => getComputedStyle(node).unicodeBidi),
    ).toBe("isolate");
    await caret(editor.locator(":scope > p").first());
    await page.keyboard.insertText(" — עריכה Edited");
    await expect.poll(savedDescription).toContain("עריכה Edited");
    await page.reload();
    await expect(editor).toContainText("עריכה Edited");
    await screenshot("01-desktop-mixed-content");
    return directions;
  });
  await check("checklist-space-toggle-and-rtl-position", async () => {
    await load();
    const item = editor.locator('[data-type="taskItem"]').first();
    const checkbox = item.getByRole("checkbox");
    await expect(checkbox).toBeEnabled();
    const checkboxBox = await checkbox.boundingBox();
    const textBox = await item.locator("p").boundingBox();
    expect(checkboxBox.x).toBeGreaterThan(textBox.x);
    await checkbox.focus();
    await page.keyboard.press("Space");
    await expect(checkbox).toHaveAttribute("aria-checked", "true");
    await expect.poll(savedDescription).toContain("- [x]");
    await page.reload();
    await expect(
      editor.locator('[data-type="taskItem"]').first().getByRole("checkbox"),
    ).toHaveAttribute("aria-checked", "true");
    await screenshot("02-checklist");
    return { checkboxBox, textBox, keyboardTogglePersisted: true };
  });
  await check("table-rtl-arrow-tab-and-selection", async () => {
    await load();
    const row = editor.locator("table tr").nth(2);
    const cells = row.locator("td");
    await caret(cells.nth(0).locator("p"), "start");
    await page.keyboard.press("ArrowLeft");
    await expect.poll(selectedCellIndex).toBe(1);
    await page.keyboard.press("ArrowRight");
    await expect.poll(selectedCellIndex).toBe(0);
    await page.keyboard.press("Tab");
    await expect.poll(selectedCellIndex).toBe(1);
    await page.keyboard.press("Shift+Tab");
    await expect.poll(selectedCellIndex).toBe(0);
    await page.keyboard.press("Shift+ArrowLeft");
    await expect(editor.locator(".selectedCell")).toHaveCount(2);
    await screenshot("03-table-selection");
    return {
      firstCellX: (await cells.nth(0).boundingBox()).x,
      secondCellX: (await cells.nth(1).boundingBox()).x,
      selectedCells: 2,
    };
  });
  await check("table-nonempty-physical-boundaries-both-arrows", async () => {
    await load(
      1440,
      1000,
      "| אבג | דהו |\n| --- | --- |\n| ABC | DEF |\n| אבג | DEF |\n| ABC | דהו |",
    );
    const cases = [];
    const rows = editor.locator("table tr");
    for (let rowIndex = 0; rowIndex < 4; rowIndex++) {
      const cells = rows.nth(rowIndex).locator("td,th");
      const directions = await cells
        .locator("p")
        .evaluateAll((nodes) =>
          nodes.map((node) => getComputedStyle(node).direction),
        );
      for (const key of ["ArrowLeft", "ArrowRight"]) {
        const source = key === "ArrowLeft" ? 0 : 1;
        const target = 1 - source;
        const sourceEnd =
          (key === "ArrowLeft") === (directions[source] === "rtl");
        const targetEnd =
          (key === "ArrowRight") === (directions[target] === "rtl");
        await caret(
          cells.nth(source).locator("p"),
          sourceEnd ? "end" : "start",
        );
        await page.keyboard.press(key);
        await expect.poll(selectedCellCaret).toEqual({
          cell: target,
          offset: targetEnd ? 3 : 0,
        });
        // The next arrow must traverse target text, rather than skip it.
        await page.keyboard.press(key);
        await expect.poll(selectedCellCaret).toEqual({
          cell: target,
          offset: targetEnd ? 2 : 1,
        });
        cases.push({ rowIndex, key, directions, targetEnd });
      }
    }
    await screenshot("03-nonempty-table-boundaries");
    return cases;
  });
  await check("table-mixed-paragraph-boundaries-both-arrows", async () => {
    const cases = [];
    for (const key of ["ArrowLeft", "ArrowRight"]) {
      for (const texts of [
        ["אבג", "ABC"],
        ["ABC", "אבג"],
      ]) {
        const target = key === "ArrowLeft" ? 1 : 0;
        const content = `<td>${texts.map((text) => `<p>${text}</p>`).join("")}</td>`;
        const source = "<td><p>דהו</p></td>";
        await load(
          1440,
          1000,
          `<table><tr>${target ? source + content : content + source}</tr></table>`,
        );
        const cells = editor.locator("table tr").first().locator("td,th");
        const targetParagraph = key === "ArrowLeft" ? 0 : 1;
        const paragraph = cells.nth(target).locator("p").nth(targetParagraph);
        const rtl = await paragraph.evaluate(
          (node) => getComputedStyle(node).direction === "rtl",
        );
        const end = (key === "ArrowRight") === rtl;
        const offset = targetParagraph * 3 + (end ? 3 : 0);
        await caret(
          cells.nth(1 - target).locator("p"),
          key === "ArrowLeft" ? "end" : "start",
        );
        await page.keyboard.press(key);
        await expect.poll(selectedCellCaret).toEqual({ cell: target, offset });
        await page.keyboard.press(key);
        await expect
          .poll(selectedCellCaret)
          .toEqual({ cell: target, offset: offset + (end ? -1 : 1) });
        cases.push({ key, texts, targetParagraph, offset });
      }
    }
    await screenshot("03-mixed-paragraph-table-boundaries");
    return cases;
  });
  await check("table-left-edge-resize-persists-after-reload", async () => {
    await load();
    const cell = editor.locator("table th").first();
    await cell.scrollIntoViewIfNeeded();
    const before = await cell.boundingBox();
    await page.mouse.move(before.x + 1, before.y + before.height / 2);
    await expect(editor.locator(".column-resize-handle").first()).toBeVisible();
    await page.mouse.down();
    await page.mouse.move(before.x - 59, before.y + before.height / 2, {
      steps: 6,
    });
    await page.mouse.up();
    const width = Number(await cell.getAttribute("colwidth"));
    expect(width).toBeGreaterThan(before.width + 50);
    await expect.poll(savedDescription).toContain("colwidth");
    await page.reload();
    await expect(cell).toHaveAttribute("colwidth", String(width));
    await screenshot("04-table-resized-reloaded");
    return {
      before: before.width,
      width,
      reloadedWidth: (await cell.boundingBox()).width,
    };
  });
  await check("image-rtl-pointer-and-keyboard-resize-persist", async () => {
    await load();
    const image = editor.locator(".kaneo-editor-image");
    const handle = editor.getByRole("button", {
      name: he.tasks.detail.editor.image.resizeHandle,
      exact: true,
    });
    await image.scrollIntoViewIfNeeded();
    await image.hover();
    const before = await image.boundingBox();
    const control = await handle.boundingBox();
    expect(control.x).toBeLessThan(before.x + 20);
    await page.mouse.move(
      control.x + control.width / 2,
      control.y + control.height / 2,
    );
    await page.mouse.down();
    await page.mouse.move(
      control.x + control.width / 2 - 48,
      control.y + control.height / 2,
      { steps: 6 },
    );
    await page.mouse.up();
    await expect(image).toHaveAttribute("width", "288");
    await handle.focus();
    await page.keyboard.press("ArrowLeft");
    await expect(image).toHaveAttribute("width", "304");
    await page.keyboard.press("ArrowRight");
    await expect(image).toHaveAttribute("width", "288");
    await expect.poll(savedDescription).toContain('width="288"');
    await page.reload();
    await expect(image).toHaveAttribute("width", "288");
    await screenshot("05-image-resized");
    return { initialWidth: before.width, persistedWidth: 288 };
  });
  await check("comment-mixed-text-save-and-reload", async () => {
    await load();
    await comment.scrollIntoViewIfNeeded();
    await comment.click();
    const commentText = `תגובה בעברית Comment TICK-123 ${Date.now()}`;
    await page.keyboard.insertText(commentText);
    await page.keyboard.press("Enter");
    await page.keyboard.insertText("English comment שלום");
    const directions = await comment
      .locator("p")
      .evaluateAll((nodes) =>
        nodes.map((node) => getComputedStyle(node).direction),
      );
    expect(directions).toEqual(["rtl", "ltr"]);
    const saved = page.waitForResponse(
      (response) =>
        response.url().includes("/api/activity/comment") &&
        response.request().method() === "POST",
    );
    await page.keyboard.press("ControlOrMeta+Enter");
    expect((await saved).ok()).toBe(true);
    await expect(comment).toHaveText("");
    await page.reload();
    const text = page.getByText(commentText, { exact: true });
    await expect(text).toBeVisible();
    expect(
      await text.evaluate((node) => getComputedStyle(node).direction),
    ).toBe("rtl");
    await screenshot("06-mixed-comment");
    return { directions, persisted: true };
  });
  for (const [label, width, height] of [
    ["desktop", 1440, 1000],
    ["mobile", 390, 844],
  ]) {
    await check(`${label}-slash-menu-keyboard-position`, async () => {
      await load(width, height);
      await caret(editor.locator(":scope > p").last());
      await page.keyboard.press("Enter");
      await page.keyboard.insertText("/");
      const menu = shell.locator(".kaneo-tiptap-slash-menu");
      const box = await viewportBox(menu);
      await screenshot(`07-${label}-slash-menu`);
      await page.keyboard.press("ArrowDown");
      const selected = await menu.locator(".is-selected").innerText();
      await page.keyboard.press("Escape");
      await expect(menu).toHaveCount(0);
      await page.keyboard.press("Backspace");
      return { box, selected };
    });
    await check(`${label}-link-editor-position-and-ltr-url`, async () => {
      await load(width, height);
      const paragraph = editor.locator(":scope > p").first();
      await caret(paragraph, "start");
      await paragraph.evaluate((node) => {
        const range = document.createRange();
        range.setStart(node.firstChild, 0);
        range.setEnd(node.firstChild, 4);
        const selection = getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
      });
      await expect
        .poll(() => page.evaluate(() => getSelection().toString()))
        .toBe("שלום");
      await page.waitForTimeout(300);
      await page.keyboard.press("ControlOrMeta+k");
      const input = page.getByRole("textbox", {
        name: he.common.editor.link.label,
        exact: true,
      });
      await expect(input).toBeVisible();
      await expect(input).toHaveAttribute("dir", "ltr");
      const box = await viewportBox(input.locator(".."));
      await input.fill(`${baseURL}/__editor-acceptance-link?item=456`);
      await screenshot(`08-${label}-link-editor`);
      await page.keyboard.press("Enter");
      await expect(editor.locator('a[href*="item=456"]')).toHaveCount(1);
      return { box };
    });
    await check(
      `${label}-table-toolbar-position-and-insert-column`,
      async () => {
        await load(width, height);
        await caret(
          editor.locator("table tr").nth(1).locator("td p").first(),
          "start",
        );
        const button = page.getByRole("button", {
          name: he.tasks.editor.table.addColumnAfter,
          exact: true,
        });
        await expect(button).toBeVisible();
        const toolbar = page
          .locator(".kaneo-tiptap-bubble")
          .filter({ has: button });
        const box = await viewportBox(toolbar);
        await screenshot(`09-${label}-table-toolbar`);
        await button.click();
        await expect(
          editor.locator("table tr").first().locator("th"),
        ).toHaveCount(3);
        return { box, columns: 3 };
      },
    );
  }
  await check("short-viewport-slash-selection-stays-visible", async () => {
    await load(390, 320);
    await caret(editor.locator(":scope > p").last());
    await page.keyboard.press("Enter");
    await page.keyboard.insertText("/");
    const menu = shell.locator(".kaneo-tiptap-slash-menu");
    await viewportBox(menu);
    await page.keyboard.press("ArrowUp");
    const selected = menu.locator(".is-selected");
    await expect
      .poll(() => menu.evaluate((node) => node.scrollTop))
      .toBeGreaterThan(0);
    const bounds = await menu.boundingBox();
    const item = await selected.boundingBox();
    expect(item.y).toBeGreaterThanOrEqual(bounds.y);
    expect(item.y + item.height).toBeLessThanOrEqual(bounds.y + bounds.height);
    const selectedText = await selected.innerText();
    await screenshot("10-short-viewport-active-command");
    await page.keyboard.press("Escape");
    await expect(menu).toHaveCount(0);
    return { bounds, item, selectedText };
  });
} finally {
  evidence.finishedAt = new Date().toISOString();
  await writeFile(
    new URL("results.json", resultDir),
    JSON.stringify(evidence, null, 2),
  );
  await browser.close();
}
if (evidence.checks.some((item) => item.status !== "passed"))
  process.exitCode = 1;
