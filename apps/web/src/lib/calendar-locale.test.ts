import { describe, expect, it } from "vite-plus/test";
import { isLocaleWeekend } from "./calendar-locale";

describe("locale weekends", () => {
  const friday = new Date(2026, 9, 23);
  const saturday = new Date(2026, 9, 24);
  const sunday = new Date(2026, 9, 25);

  it("shades Friday and Saturday for Israel", () => {
    expect(isLocaleWeekend(friday, "he-IL")).toBe(true);
    expect(isLocaleWeekend(saturday, "he-IL")).toBe(true);
    expect(isLocaleWeekend(sunday, "he-IL")).toBe(false);
  });

  it("preserves Saturday and Sunday for US English", () => {
    expect(isLocaleWeekend(friday, "en-US")).toBe(false);
    expect(isLocaleWeekend(saturday, "en-US")).toBe(true);
    expect(isLocaleWeekend(sunday, "en-US")).toBe(true);
  });
});
