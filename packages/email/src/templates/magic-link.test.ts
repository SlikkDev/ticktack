import { render } from "@react-email/render";
import { createElement } from "react";
import { describe, expect, it } from "vite-plus/test";
import MagicLinkEmail from "./magic-link";

describe("MagicLinkEmail", () => {
  it("renders Japanese copy for a Japanese locale", async () => {
    const html = await render(
      createElement(MagicLinkEmail, {
        magicLink: "https://kaneo.example/auth",
        locale: "ja-JP",
      }),
    );
    expect(html).toContain("TickTack にサインイン");
    expect(html).toContain("TickTack セキュリティメール");
  });

  it("renders Traditional Chinese copy for a zh-TW locale", async () => {
    const html = await render(
      createElement(MagicLinkEmail, {
        magicLink: "https://kaneo.example/auth",
        locale: "zh-TW",
      }),
    );
    expect(html).toContain("登入 TickTack");
    expect(html).toContain("TickTack 安全性通知");
  });
});
