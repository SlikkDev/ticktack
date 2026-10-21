import { describe, expect, it, vi } from "vite-plus/test";
import { formatDateMedium, formatNumber, formatRelativeTime } from "./format";

vi.mock("./i18n", () => ({
  i18n: { resolvedLanguage: "he-IL" },
}));

describe("localized display formatting", () => {
  const date = new Date(2026, 9, 20, 12);

  it("uses Hebrew month names with Gregorian years by default", () => {
    const formatted = formatDateMedium(date);
    expect(formatted).toContain("אוק");
    expect(formatted).toContain("2026");
    expect(formatted).not.toContain("5787");
  });

  it("preserves an explicit English choice", () => {
    expect(formatDateMedium(date, "en-US")).toBe("Oct 20, 2026");
  });

  it("formats numbers without changing their numerical meaning", () => {
    expect(formatNumber(1234.5, undefined, "he-IL")).toBe("1,234.5");
    expect(formatNumber(1234.5, undefined, "en-US")).toBe("1,234.5");
  });

  it("preserves exact numeric strings and bigint values beyond Number precision", () => {
    expect(
      formatNumber("9007199254740993.125", {
        maximumSignificantDigits: 21,
      }),
    ).toBe("9,007,199,254,740,993.125");
    expect(formatNumber(9007199254740993n)).toBe("9,007,199,254,740,993");
  });

  it("uses Hebrew relative time and supports English", () => {
    const tomorrow = new Date(2026, 9, 21, 12);
    expect(formatRelativeTime(tomorrow, "he-IL", date)).toBe("מחר");
    expect(formatRelativeTime(tomorrow, "en-US", date)).toBe("tomorrow");
  });
});
