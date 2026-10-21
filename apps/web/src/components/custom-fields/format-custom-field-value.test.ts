import { beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { formatCustomFieldValue } from "./format-custom-field-value";

const locale = vi.hoisted(() => ({ resolvedLanguage: "en-US" }));

vi.mock("@/lib/i18n", () => ({ i18n: locale }));

beforeEach(() => {
  locale.resolvedLanguage = "en-US";
});

describe("formatCustomFieldValue", () => {
  it("returns null for empty values and booleans", () => {
    expect(formatCustomFieldValue("text", " ", "short")).toBeNull();
    expect(formatCustomFieldValue("multiselect", "[]", "short")).toBeNull();
    expect(formatCustomFieldValue("boolean", "true", "short")).toBeNull();
  });

  it("shows two options and counts the rest", () => {
    expect(
      formatCustomFieldValue("multiselect", '["Web","iOS","Android"]', "short"),
    ).toEqual({ text: "Web, iOS", more: 1 });
  });

  it("formats dates as local calendar days", () => {
    expect(formatCustomFieldValue("date", "2026-10-22", "short")?.text).toMatch(
      /22/,
    );
    expect(
      formatCustomFieldValue("date", "2026-10-22", "medium")?.text,
    ).toMatch(/2026/);
  });

  it("keeps unparseable dates and plain values as typed", () => {
    expect(formatCustomFieldValue("date", "soon", "short")?.text).toBe("soon");
    expect(formatCustomFieldValue("number", "5", "short")).toEqual({
      text: "5",
      more: 0,
    });
  });

  it("formats numeric displays in the current locale without rounding through Number", () => {
    locale.resolvedLanguage = "he-IL";
    expect(
      formatCustomFieldValue("number", "9007199254740993.125", "short"),
    ).toEqual({ text: "9,007,199,254,740,993.125", more: 0 });
    expect(
      formatCustomFieldValue("number", "0.00000000000000000000125", "short"),
    ).toEqual({ text: "0.00000000000000000000125", more: 0 });

    locale.resolvedLanguage = "de-DE";
    expect(formatCustomFieldValue("number", "1234.56789", "short")).toEqual({
      text: "1.234,56789",
      more: 0,
    });
  });

  it.each(["1,234", "not a number", "Infinity", "NaN", "1e999", "0x10"])(
    "keeps invalid or non-finite numeric text %s unchanged",
    (value) => {
      expect(formatCustomFieldValue("number", value, "short")).toEqual({
        text: value,
        more: 0,
      });
    },
  );

  it("only formats number fields and leaves text identifiers unchanged", () => {
    expect(formatCustomFieldValue("text", "001234.50", "short")).toEqual({
      text: "001234.50",
      more: 0,
    });
    expect(formatCustomFieldValue("number", "+001234.50", "short")).toEqual({
      text: "1,234.5",
      more: 0,
    });
  });

  it("accepts the reactive locale from a field component when the language changes", () => {
    expect(
      formatCustomFieldValue("number", "1234.5", "short", "de-DE"),
    ).toEqual({ text: "1.234,5", more: 0 });
    expect(
      formatCustomFieldValue("number", "1234.5", "short", "en-US"),
    ).toEqual({ text: "1,234.5", more: 0 });
  });
});
