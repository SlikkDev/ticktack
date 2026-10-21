import { describe, expect, it } from "vite-plus/test";
import { getAuthEmailCopy } from "./auth-email-copy";

describe("authentication email subjects", () => {
  it("uses Hebrew for Hebrew language variants and isolates the code", () => {
    for (const locale of ["he", "he-IL", "HE-il"]) {
      const copy = getAuthEmailCopy(locale);
      expect(copy.magicLinkSubject).toBe("קישור התחברות לטיקטק");
      expect(copy.passwordResetSubject).toContain("איפוס הסיסמה");
      expect(copy.otpSubject("123456")).toContain("\u2066123456\u2069");
    }
  });
  it("preserves English and supported translations with TickTack branding", () => {
    expect(getAuthEmailCopy("en-US").magicLinkSubject).toBe(
      "Login for TickTack",
    );
    expect(getAuthEmailCopy("de-DE").passwordResetSubject).toContain(
      "TickTack",
    );
  });
});
