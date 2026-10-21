import { describe, expect, it } from "vite-plus/test";
import { localeDirection, logicalArrow, timelineDayDelta } from "./direction";

describe("Hebrew direction", () => {
  it("preserves English and resolves Hebrew language variants", () => {
    expect(localeDirection("he-IL")).toBe("rtl");
    expect(localeDirection("he")).toBe("rtl");
    expect(localeDirection("en-US")).toBe("ltr");
  });

  it("moves dates forward toward inline end and backward toward inline start", () => {
    expect(timelineDayDelta(88, 44, "ltr")).toBe(2);
    expect(timelineDayDelta(-88, 44, "rtl")).toBe(2);
    expect(timelineDayDelta(88, 44, "rtl")).toBe(-2);
    expect(timelineDayDelta(-88, 44, "ltr")).toBe(-2);
  });

  it("maps horizontal keyboard movement while preserving vertical movement", () => {
    expect(logicalArrow("left", "rtl")).toBe("right");
    expect(logicalArrow("right", "rtl")).toBe("left");
    expect(logicalArrow("down", "rtl")).toBe("down");
    expect(logicalArrow("left", "ltr")).toBe("left");
  });
});
