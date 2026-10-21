import { describe, expect, it } from "vite-plus/test";
import { getInvitationEmailSubject } from "./get-invitation-email-subject";
import { getInvitationRoleLabel } from "./get-workspace-invitation-email-copy";

describe("Hebrew invitation email copy", () => {
  it("isolates mixed-language names in the subject", () => {
    expect(getInvitationEmailSubject("he-IL", "נועה Noa", "Team 2")).toBe(
      "\u2068נועה Noa\u2069 הזמין אותך להצטרף אל \u2068Team 2\u2069 בטיקטק",
    );
  });

  it("retains English subjects and translates supported invitation roles", () => {
    expect(getInvitationEmailSubject("en-US", "Noa", "Team")).toBe(
      "Noa invited you to join Team on TickTack",
    );
    expect(getInvitationRoleLabel("he-IL", "member,admin")).toBe(
      "חבר צוות, מנהל",
    );
    expect(getInvitationRoleLabel("he-IL", "custom")).toBe("custom");
  });
});
