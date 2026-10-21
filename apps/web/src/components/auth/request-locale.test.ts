import { afterEach, expect, it } from "vite-plus/test";
import { rememberLocale } from "@/lib/i18n/preference";
import { getAuthRequestLocale } from "./request-locale";

afterEach(() => localStorage.removeItem("ticktack.locale"));

it("uses the currently selected supported language before a saved preference", () => {
  rememberLocale("he-IL");
  expect(getAuthRequestLocale("en-US")).toBe("en-US");
});

it("retains the saved English choice when no resolved language is available", () => {
  rememberLocale("en-US");
  expect(getAuthRequestLocale()).toBe("en-US");
  expect(getAuthRequestLocale("invalid")).toBe("en-US");
});

it("defaults a first-time visitor to Hebrew", () => {
  expect(getAuthRequestLocale()).toBe("he-IL");
});
