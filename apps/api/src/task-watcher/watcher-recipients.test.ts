import { describe, expect, it } from "vite-plus/test";
import { watcherRecipients } from "./watcher-recipients";

describe("watcherRecipients", () => {
  it("drops the actor and already-notified users", () => {
    expect(
      watcherRecipients(["a", "b", "c", "d"], ["a", "c", null, undefined]),
    ).toEqual(["b", "d"]);
  });

  it("returns each watcher once", () => {
    expect(watcherRecipients(["a", "a", "b"], [])).toEqual(["a", "b"]);
  });

  it("returns nothing when nobody is watching", () => {
    expect(watcherRecipients([], ["a"])).toEqual([]);
  });
});
