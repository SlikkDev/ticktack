import * as email from "@kaneo/email";
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vite-plus/test";
import db, { schema } from "../../apps/api/src/database";
import { createApp } from "../../apps/api/src/index";
import { drainSignInEmails } from "../../apps/api/src/utils/sign-in-email-tasks";
import { resetTestDatabase } from "./helpers/database";

async function post(path: string, body: object, locale: string) {
  const response = await createApp().app.request(`/api/auth${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "http://localhost:5173",
      "x-ticktack-locale": locale,
    },
    body: JSON.stringify(body),
  });
  await drainSignInEmails();
  return response;
}

describe("authentication locale persistence", () => {
  beforeEach(resetTestDatabase);

  it.each(["he-IL", "en-US"])(
    "uses the requested %s copy, persists new-account locale, then respects it over later hints",
    async (locale) => {
      const address = "locale-fixture@example.com";
      const send = vi.spyOn(email, "sendOtpEmail").mockResolvedValue(undefined);
      expect(
        (
          await post(
            "/email-otp/send-verification-otp",
            { email: address, type: "sign-in" },
            locale,
          )
        ).status,
      ).toBe(200);
      expect(send).toHaveBeenCalledTimes(1);
      const data = send.mock.lastCall?.[2] as { otp: string; locale: string };
      expect(data.locale).toBe(locale);
      expect(data.otp).toMatch(/^\d{6}$/);
      const subject =
        locale === "he-IL"
          ? `קוד ההתחברות שלך לטיקטק: \u2066${data.otp}\u2069`
          : `${data.otp} is your TickTack sign-in code`;
      expect(send.mock.lastCall?.[1]).toBe(subject);
      expect(
        (
          await post(
            "/sign-in/email-otp",
            { email: address, otp: data.otp, locale },
            locale,
          )
        ).status,
      ).toBe(200);
      const users = await db
        .select()
        .from(schema.userTable)
        .where(eq(schema.userTable.email, address));
      expect(users).toEqual([expect.objectContaining({ locale })]);

      const conflictingLocale = locale === "he-IL" ? "en-US" : "he-IL";
      expect(
        (
          await post(
            "/email-otp/send-verification-otp",
            { email: address, type: "sign-in" },
            conflictingLocale,
          )
        ).status,
      ).toBe(200);
      const nextData = send.mock.lastCall?.[2] as {
        otp: string;
        locale: string;
      };
      expect(send).toHaveBeenCalledTimes(2);
      expect(nextData.locale).toBe(locale);
      expect(
        (
          await post(
            "/sign-in/email-otp",
            { email: address, otp: nextData.otp, locale: conflictingLocale },
            conflictingLocale,
          )
        ).status,
      ).toBe(200);
      expect(
        await db
          .select({ locale: schema.userTable.locale })
          .from(schema.userTable)
          .where(eq(schema.userTable.email, address)),
      ).toEqual([{ locale }]);
      expect(await db.select().from(schema.userTable)).toHaveLength(1);
    },
  );
});
