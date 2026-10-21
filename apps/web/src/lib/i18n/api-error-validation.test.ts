import english from "@i18n/en-US.json";
import hebrew from "@i18n/he-IL.json";
import i18n from "i18next";
import { beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { getApiValidationMessage } from "./api-error-validation";

vi.mock("i18next", async (importOriginal) => {
  const { default: i18next } = await importOriginal<typeof import("i18next")>();
  return { default: i18next.createInstance() };
});

beforeEach(async () => {
  await i18n.init({
    lng: "he-IL",
    fallbackLng: "en-US",
    resources: { "en-US": english, "he-IL": hebrew },
    interpolation: { escapeValue: false },
  });
});

describe("getApiValidationMessage", () => {
  it.each([
    ["Required", "required", undefined],
    [
      "Invalid input: expected string, received undefined",
      "required",
      undefined,
    ],
    ["Too small: expected string to have >=8 characters", "minCharacters", "8"],
    [
      "Too big: expected string to have <=128 characters",
      "maxCharacters",
      "128",
    ],
    ["Too small: expected array to have >=2 items", "minItems", "2"],
    ["Too big: expected array to have <=50 items", "maxItems", "50"],
    ["Too small: expected number to be >=-5.5", "minNumber", "-5.5"],
    ["Too big: expected number to be <=100", "maxNumber", "100"],
    ["Too small: expected number to be >0", "greaterThan", "0"],
    ["Too big: expected number to be <10", "lessThan", "10"],
    ["Invalid email address", "email", undefined],
    ["Invalid URL", "url", undefined],
    ["Invalid input: expected int, received number", "integer", undefined],
    ['Invalid option: expected one of "todo"|"done"', "option", undefined],
  ])("preserves the actionable constraint in %s", (message, key, limit) => {
    expect(getApiValidationMessage([{ path: "body.title", message }])).toBe(
      i18n.t(`common:apiErrors.validation.${key}`, {
        field: hebrew.common.apiErrors.fields.title,
        ...(limit === undefined ? {} : { limit }),
      }),
    );
  });

  it("does not echo unknown field names, values, enum options or HTML", () => {
    for (const path of [
      "body.private_api_token",
      "body.__proto__",
      "body.<script>",
    ]) {
      const message = getApiValidationMessage([
        { path, message: "Internal secret=example <script>alert(1)</script>" },
      ]);
      expect(message).toBe("יש לבדוק את הערך בשדה זה.");
    }
  });

  it("deduplicates repeated messages and bounds the number displayed", () => {
    const issues = Array.from({ length: 100 }, (_, index) => ({
      path: index === 99 ? "body.password" : "body.title",
      message:
        index === 99
          ? "Too small: expected string to have >=8 characters"
          : "Required",
    }));
    expect(getApiValidationMessage(issues)).toBe("יש להזין ערך בשדה כותרת.");
  });

  it.each([undefined, null, [], "invalid", [null], [{ message: 123 }]])(
    "ignores malformed issue data: %j",
    (issues) => {
      expect(getApiValidationMessage(issues)).toBeUndefined();
    },
  );
});
