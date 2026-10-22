import { describe, expect, it } from "vite-plus/test";
import { matchTasks, normalizeSpoken } from "./match-task";

const projects = [
  { id: "p-web", slug: "WEB" },
  { id: "p-api", slug: "API" },
];

const tasks = [
  { id: "1", title: "Fix the login bug", number: 12, projectId: "p-web" },
  { id: "2", title: "Login page redesign", number: 13, projectId: "p-web" },
  { id: "3", title: "Call the plumber", number: 1, projectId: "p-api" },
  { id: "4", title: "Plumber: send invoice", number: 2, projectId: "p-api" },
  { id: "5", title: "תיקון באג בהתחברות", number: 3, projectId: "p-api" },
];

describe("normalizeSpoken", () => {
  it("folds case, accents, punctuation and spacing", () => {
    expect(normalizeSpoken("  Café   Déjà-vu! ")).toBe("cafe deja vu");
    expect(normalizeSpoken("WEB-12")).toBe("web 12");
  });
});

describe("matchTasks", () => {
  it("prefers a ticket id, then an exact title", () => {
    expect(matchTasks(tasks, "web 12", projects).map((t) => t.id)).toEqual([
      "1",
    ]);
    expect(matchTasks(tasks, "WEB-13", projects).map((t) => t.id)).toEqual([
      "2",
    ]);
    expect(
      matchTasks(tasks, "call the Plumber.", projects).map((t) => t.id),
    ).toEqual(["3"]);
  });

  it("falls back to substring and then any-order word matches", () => {
    expect(matchTasks(tasks, "login page", projects).map((t) => t.id)).toEqual([
      "2",
    ]);
    expect(matchTasks(tasks, "plumber", projects).map((t) => t.id)).toEqual([
      "3",
      "4",
    ]);
    expect(matchTasks(tasks, "bug login", projects).map((t) => t.id)).toEqual([
      "1",
    ]);
  });

  it("matches Hebrew titles and returns nothing for blank or unknown names", () => {
    expect(
      matchTasks(tasks, "באג בהתחברות", projects).map((t) => t.id),
    ).toEqual(["5"]);
    expect(matchTasks(tasks, "   ", projects)).toEqual([]);
    expect(matchTasks(tasks, "quarterly report", projects)).toEqual([]);
  });

  it("works without project slugs", () => {
    expect(matchTasks(tasks, "web 12").map((t) => t.id)).toEqual([]);
    expect(matchTasks(tasks, "fix the login bug").map((t) => t.id)).toEqual([
      "1",
    ]);
  });
});
