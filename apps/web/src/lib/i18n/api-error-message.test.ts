import english from "@i18n/en-US.json";
import hebrew from "@i18n/he-IL.json";
import i18n from "i18next";
import { beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { HttpError, isUnauthorizedError } from "../http-error";
import { apiErrorCodeKeys, apiErrorStatusKeys } from "./api-error-codes";
import { getApiErrorMessage } from "./api-error-message";

vi.mock("i18next", async (importOriginal) => {
  const { default: i18next } = await importOriginal<typeof import("i18next")>();
  return { default: i18next.createInstance() };
});

beforeEach(async () => {
  await i18n.init({
    lng: "he-IL",
    fallbackLng: "en-US",
    resources: {
      "en-US": structuredClone(english),
      "he-IL": structuredClone(hebrew),
    },
    interpolation: { escapeValue: false },
  });
});

describe("getApiErrorMessage", () => {
  it("has English and Hebrew translations for every mapped code and status", () => {
    for (const key of [
      ...Object.values(apiErrorCodeKeys),
      ...Object.values(apiErrorStatusKeys),
    ]) {
      expect(i18n.exists(key, { lng: "en-US", fallbackLng: false }), key).toBe(
        true,
      );
      expect(i18n.exists(key, { lng: "he-IL", fallbackLng: false }), key).toBe(
        true,
      );
    }
  });

  it.each([
    ["INVALID_EMAIL_OR_PASSWORD", "common:apiErrors.invalidCredentials"],
    ["PASSWORD_TOO_SHORT", "auth:forms.passwordTooShort"],
    ["PASSWORD_TOO_LONG", "common:apiErrors.passwordTooLong"],
    ["CAPTCHA_FAILED", "common:apiErrors.captchaFailed"],
    ["OTP_EXPIRED", "auth:verifyOtp.expired"],
    ["DISPOSABLE_EMAIL_NOT_ALLOWED", "auth:forms.disposableEmail"],
    ["LOCAL_SIGN_IN_DISABLED", "common:apiErrors.localSignInDisabled"],
    ["EMAIL_CODE_REGISTRATION_REQUIRED", "common:apiErrors.emailCodeRequired"],
    ["INVITATION_EMAIL_FAILED", "settings:invitationEmailFailed"],
    ["SOLE_WORKSPACE_OWNER", "common:apiErrors.soleWorkspaceOwner"],
  ])(
    "translates provider code %s without displaying provider text",
    (code, key) => {
      expect(
        getApiErrorMessage({
          code,
          status: 400,
          message: "Internal provider details",
        }),
      ).toBe(i18n.t(key));
    },
  );

  it("uses the requested Hebrew locale when resolvedLanguage falls back to English", async () => {
    i18n.removeResourceBundle("he-IL", "common");
    i18n.removeResourceBundle("he-IL", "auth");
    await i18n.changeLanguage("he-IL");
    expect(i18n.language).toBe("he-IL");
    expect(
      getApiErrorMessage(
        { message: "unrecognized upstream failure" },
        "Sign-in failed",
      ),
    ).toBe("אירעה שגיאה לא צפויה.");
  });

  it("supports a language-only Hebrew preference", async () => {
    await i18n.changeLanguage("he");
    expect(getApiErrorMessage({ status: 403, message: "Forbidden" })).toBe(
      hebrew.common.apiErrors.forbidden,
    );
  });

  it("uses a localized caller fallback for an unrecognized provider code", () => {
    expect(
      getApiErrorMessage(
        {
          code: "FUTURE_PROVIDER_FAILURE",
          message: "Unknown provider details",
        },
        "לא ניתן להיכנס כרגע.",
      ),
    ).toBe("לא ניתן להיכנס כרגע.");
  });

  it.each([400, 401, 403, 404, 409, 413, 422, 429])(
    "uses localized status guidance for an unknown %s response",
    (status) => {
      expect(
        getApiErrorMessage({ status, message: "Unknown upstream error" }),
      ).toBe(i18n.t(apiErrorStatusKeys[status]));
    },
  );

  it.each([
    null,
    undefined,
    "server detail",
    {},
    { message: "" },
    { code: "__proto__" },
  ])("gives an unknown failure a safe Hebrew fallback: %j", (error) => {
    expect(getApiErrorMessage(error)).toBe(
      hebrew.common.error.messages.unknown,
    );
  });

  it("does not expose arbitrary response values in either language", async () => {
    for (const language of ["he-IL", "en-US"]) {
      await i18n.changeLanguage(language);
      for (const error of [
        { status: 502, message: "proxy at internal-host:5432, secret=example" },
        {
          status: 400,
          message: "<html><body>internal proxy details</body></html>",
        },
        {
          message:
            "TypeError: secret=example\n    at database.connect (internal.ts:10)",
        },
        { message: "SQLSTATE 23505 table internal_users" },
        { message: "Database error: select password from internal_users" },
      ]) {
        expect(getApiErrorMessage(error)).toBe(
          i18n.t("common:error.messages.server"),
        );
      }
    }
  });

  it("preserves actionable legacy date guidance without echoing the submitted value", () => {
    expect(
      getApiErrorMessage({
        status: 400,
        code: "BAD_REQUEST",
        message:
          'Invalid dueDate "private input". Please provide a valid date string.',
      }),
    ).toBe(hebrew.common.apiErrors.invalidDate);
    expect(
      getApiErrorMessage({
        status: 400,
        code: "BAD_REQUEST",
        message:
          "Start date cannot be after due date. Please adjust the date range.",
      }),
    ).toBe(hebrew.common.apiErrors.dateRange);
  });

  it("preserves the existing non-server English error wording", async () => {
    await i18n.changeLanguage("en-US");
    expect(
      getApiErrorMessage({
        code: "INVALID_EMAIL_OR_PASSWORD",
        status: 401,
        message: "Custom provider sign-in guidance",
      }),
    ).toBe("Custom provider sign-in guidance");
    expect(getApiErrorMessage(new Error("Task not found"))).toBe(
      "Task not found",
    );
    expect(getApiErrorMessage({}, "Could not sign in")).toBe(
      "Could not sign in",
    );
  });
});

describe("HttpError Hebrew response integration", () => {
  it("also localizes directly constructed errors from description readers", () => {
    const error = new HttpError(404, "Failed to load description");
    expect(error.message).toBe(hebrew.common.apiErrors.notFound);
    expect(error.originalMessage).toBe("Failed to load description");
  });

  it("localizes validation while preserving issues and permission metadata", async () => {
    const issues = [
      { path: "body.title", message: "Required" },
      {
        path: "body.description",
        message: "Too big: expected string to have <=1000 characters",
      },
    ];
    const error = await HttpError.fromResponse(
      Response.json(
        {
          code: "VALIDATION_ERROR",
          message: "title: Required",
          issues,
          missingPermissions: ["task:update"],
        },
        { status: 400 },
      ),
    );
    expect(error.message).toContain("כותרת");
    expect(error.message).toContain("1000");
    expect(error.message).not.toContain("Required");
    expect(error.code).toBe("VALIDATION_ERROR");
    expect(error.issues).toEqual(issues);
    expect(error.missingPermissions).toEqual(["task:update"]);
  });

  it("keeps integration authentication errors distinct from expired app sessions", async () => {
    const integration = await HttpError.fromResponse(
      Response.json(
        {
          message: "Invalid integration token",
          code: "INTEGRATION_AUTH_FAILED",
        },
        { status: 401 },
      ),
    );
    const session = await HttpError.fromResponse(
      Response.json(
        { message: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 },
      ),
    );
    expect(integration.message).toBe(
      hebrew.common.apiErrors.integrationAuthFailed,
    );
    expect(isUnauthorizedError(integration)).toBe(false);
    expect(isUnauthorizedError(session)).toBe(true);
  });

  it("uses a safe Hebrew message for malformed, plain-text and unreadable bodies", async () => {
    for (const text of [
      "{bad json",
      "Internal upstream task detail",
      "<html>proxy error</html>",
    ]) {
      const error = await HttpError.fromResponse(
        new Response(text, { status: 503 }),
      );
      expect(error.message).toBe(hebrew.common.error.messages.server);
    }
    const error = await HttpError.fromResponse({
      status: 500,
      text: () => Promise.reject(new Error("stream failure")),
    });
    expect(error.message).toBe(hebrew.common.error.messages.server);
  });
});
