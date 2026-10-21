import assert from "node:assert/strict";
import { test } from "node:test";
import { auditHebrewCatalog } from "./check-hebrew.mjs";

test("a missing dual form fails even when every English key exists", () => {
  const result = auditHebrewCatalog(
    { common: { count_one: "{{count}} item", count_other: "{{count}} items" } },
    {
      common: { count_one: "פריט: {{count}}", count_other: "{{count}} פריטים" },
    },
  );
  assert.equal(result.counts.sourceKeysCovered, 2);
  assert.ok(
    result.errors.some(
      ({ type, key }) =>
        type === "missing-plural" && key === "common:count_two",
    ),
  );
});

test("placeholder multiplicity is preserved, not just unique placeholder names", () => {
  const result = auditHebrewCatalog(
    { common: { greeting: "{{name}} invited {{name}}" } },
    { common: { greeting: "{{name}} הזמין" } },
  );
  assert.ok(result.errors.some(({ type }) => type === "placeholder-mismatch"));
});

test("paired markup rejects broken nesting and interpolations outside their tag", () => {
  const source = { common: { text: "Sent to <email>{{email}}</email>" } };
  const broken = auditHebrewCatalog(source, {
    common: { text: "נשלח אל <email>{{email}}</link>" },
  });
  assert.ok(broken.errors.some(({ type }) => type === "invalid-markup"));
  const moved = auditHebrewCatalog(source, {
    common: { text: "נשלח אל <email>הכתובת</email> {{email}}" },
  });
  assert.ok(
    moved.errors.some(({ type }) => type === "interpolation-markup-mismatch"),
  );
  const valid = auditHebrewCatalog(source, {
    common: { text: "נשלח אל <email>{{email}}</email>" },
  });
  assert.equal(valid.ok, true);
});

test("React Trans named link components are paired rather than HTML void tags", () => {
  const result = auditHebrewCatalog(
    { settings: { text: "Connect {{provider}} in <link>Integrations</link>" } },
    { settings: { text: "חיבור {{provider}} דרך <link>שילובים</link>" } },
  );
  assert.equal(result.ok, true);
});

test("an English sentence is never passed just because a technical label is allowed", () => {
  const result = auditHebrewCatalog(
    { auth: { providers: { google: "Google" }, help: "Sign in with Google" } },
    { auth: { providers: { google: "Google" }, help: "Sign in with Google" } },
  );
  assert.equal(result.counts.allowedUnchanged, 1);
  assert.deepEqual(
    result.untranslatedCandidates.map(({ key }) => key),
    ["auth:help"],
  );
});

test("the allowlist is exact and does not permit an arbitrary URL or moved label", () => {
  const result = auditHebrewCatalog(
    { auth: { unknown: "Google", link: "https://unexpected.example.com" } },
    { auth: { unknown: "Google", link: "https://unexpected.example.com" } },
  );
  assert.equal(result.counts.untranslatedCandidates, 2);
});

test("untranslated English is detected even if it differs from the source", () => {
  const result = auditHebrewCatalog(
    { common: { cancel: "Cancel" } },
    { common: { cancel: "Dismiss" } },
  );
  assert.equal(result.counts.unchangedTotal, 0);
  assert.equal(result.counts.untranslatedCandidates, 1);
});

test("a count-bearing singular source may be replaced by a complete Hebrew plural family", () => {
  const result = auditHebrewCatalog(
    { common: { count: "{{count}} selected" } },
    {
      common: {
        count_one: "נבחר: {{count}}",
        count_two: "נבחרו {{count}}",
        count_other: "נבחרו {{count}}",
      },
    },
  );
  assert.equal(result.ok, true);
  assert.equal(result.counts.sourceKeysCovered, 1);
  assert.equal(result.counts.localeSpecificPluralKeys, 3);
});

test("unknown keys, blank values and malformed interpolation fail", () => {
  const result = auditHebrewCatalog(
    { common: { greeting: "Hello {{name}}", cancel: "Cancel" } },
    { common: { greeting: "שלום {{name}", cancel: "", typo: "טעות" } },
  );
  const types = new Set(result.errors.map(({ type }) => type));
  assert.ok(types.has("invalid-markup"));
  assert.ok(types.has("invalid-value"));
  assert.ok(types.has("extra-key"));
});
