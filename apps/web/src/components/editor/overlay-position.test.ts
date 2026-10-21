import { expect, it } from "vite-plus/test";
import { overlayLeft } from "./overlay-position";

it("aligns a popup to the RTL caret edge and keeps it within a mobile viewport", () => {
  expect(overlayLeft({ left: 340, right: 342 }, 264, 375, "rtl")).toBe(78);
  expect(overlayLeft({ left: 20, right: 22 }, 264, 375, "rtl")).toBe(8);
  expect(overlayLeft({ left: 340, right: 342 }, 264, 375, "ltr")).toBe(103);
});
