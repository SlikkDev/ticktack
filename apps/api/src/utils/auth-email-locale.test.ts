import { describe, expect, it } from "vite-plus/test";
import {
  getRequestedAuthEmailLocale,
  resolveAuthEmailLocale,
} from "./auth-email-locale";
import { getAuthEmailCopy } from "./auth-email-copy";

describe("authentication email locale selection", () => {
  it("uses the chosen locale for a first-time recipient, with Hebrew as the instance default", () => {
    expect(resolveAuthEmailLocale(null, "he-IL")).toBe("he-IL");
    expect(resolveAuthEmailLocale(null, "en-US")).toBe("en-US");
    expect(resolveAuthEmailLocale(null)).toBe("he-IL");
    expect(
      getAuthEmailCopy(resolveAuthEmailLocale(null)).magicLinkSubject,
    ).toBe("קישור התחברות לטיקטק");
  });

  it("keeps an existing user's preference ahead of an unauthenticated request hint", () => {
    expect(resolveAuthEmailLocale("en-US", "he-IL")).toBe("en-US");
    expect(resolveAuthEmailLocale("he-IL", "en-US")).toBe("he-IL");
    expect(resolveAuthEmailLocale("de-DE", "he-IL")).toBe("de-DE");
    expect(resolveAuthEmailLocale("fr-FR", "he-IL")).toBe("fr-FR");
  });

  it("canonicalizes supported values and ignores malformed or unknown header values", () => {
    expect(
      getRequestedAuthEmailLocale(
        new Headers({ "x-ticktack-locale": "HE-il" }),
      ),
    ).toBe("he-IL");
    expect(
      getRequestedAuthEmailLocale(new Headers({ "x-ticktack-locale": "en" })),
    ).toBe("en-US");
    for (const value of [
      "he-IL,en-US",
      "he<script>",
      "xx-XX",
      "he-unknown",
      "",
    ]) {
      const requested = getRequestedAuthEmailLocale(
        new Headers({ "x-ticktack-locale": value }),
      );
      expect(requested).toBeUndefined();
      expect(resolveAuthEmailLocale(null, requested)).toBe("he-IL");
    }
    expect(
      getRequestedAuthEmailLocale(new Headers({ "accept-language": "en-US" })),
    ).toBeUndefined();
  });

  it("selects a recipient's invitation language without adopting the sender's language", () => {
    expect(resolveAuthEmailLocale("en-US")).toBe("en-US");
    expect(resolveAuthEmailLocale(null)).toBe("he-IL");
  });
});
