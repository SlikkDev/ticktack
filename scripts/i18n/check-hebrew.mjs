import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  flattenLocale,
  getValueAtKey,
  i18nDir,
  PLURAL_CATEGORIES,
  readJson,
} from "./shared.mjs";

// Deliberately key-and-value specific. An English sentence, a new example, or
// a label moved to another context must be reviewed rather than silently passed.
const unchangedTechnicalLabels = new Map([
  ["auth:providers.google", "Google"],
  ["auth:providers.discord", "Discord"],
  ["auth:providers.github", "GitHub"],
  ["auth:providers.sso", "SSO"],
  ["auth:forms.emailPlaceholder", "me@example.com"],
  ["auth:forms.passwordPlaceholder", "••••••••"],
  ["auth:onboarding.cloud.invite.emailPlaceholder", "teammate@company.com"],
  ["settings:notificationsPage.ntfyTitle", "ntfy"],
  [
    "settings:notificationsPage.ntfyServerPlaceholder",
    "https://ntfy.example.com",
  ],
  ["settings:notificationsPage.ntfyTopicPlaceholder", "team-alerts"],
  ["settings:notificationsPage.gotifyTitle", "Gotify"],
  [
    "settings:notificationsPage.gotifyServerPlaceholder",
    "https://gotify.example.com",
  ],
  [
    "settings:notificationsPage.webhookUrlPlaceholder",
    "https://example.com/webhooks/kaneo",
  ],
  ["settings:notificationsPage.ruleSummary", "{{channels}} · {{projects}}"],
  [
    "settings:workspaceImport.jira.urlPlaceholder",
    "https://your-site.atlassian.net",
  ],
  [
    "settings:workspaceImport.plane.urlPlaceholder",
    "https://app.plane.so/your-workspace",
  ],
  ["settings:projectGeneral.keyPlaceholder", "PRO"],
  [
    "settings:slackIntegration.webhookPlaceholder",
    "https://hooks.slack.com/services/...",
  ],
  [
    "settings:discordIntegration.webhookPlaceholder",
    "https://discord.com/api/webhooks/...",
  ],
  [
    "settings:mattermostIntegration.webhookPlaceholder",
    "https://your-mattermost-server.com/hooks/...",
  ],
  [
    "settings:genericWebhookIntegration.webhookPlaceholder",
    "https://example.com/webhooks/kaneo",
  ],
  [
    "settings:telegramIntegration.botTokenPlaceholder",
    "123456789:AAExampleBotToken",
  ],
  ["settings:chatIntegrations.channelPlaceholder", "#team-updates"],
  ["activity:comment.editor.hintTab", "Tab"],
  ["activity:comment.editor.hintEsc", "Esc"],
  ["tasks:customFields.enterKey", "Enter"],
  ["tasks:filterMenu.searchSubject", "{{name}}…"],
  ["team:inviteModal.emailPlaceholder", "colleague@company.com"],
  ["press:darkLogoDetail", "SVG"],
  ["press:lightLogoDetail", "SVG"],
  ["press:iconDetail", "PNG, 512 × 512"],
  ["landing:hero.github", "GitHub"],
  ["landing:hero.productHunt", "Product Hunt"],
]);

const codeLanguageLabels = {
  bash: "Bash",
  csharp: "C#",
  cpp: "C++",
  css: "CSS",
  clojure: "Clojure",
  cypher: "Cypher",
  dart: "Dart",
  diff: "Diff",
  elixir: "Elixir",
  excel: "Excel",
  go: "Golang",
  graphql: "GraphQL",
  html: "HTML",
  haskell: "Haskell",
  json: "JSON",
  java: "Java",
  javascript: "JavaScript",
  kotlin: "Kotlin",
  makefile: "Makefile",
  markdown: "Markdown",
  mermaid: "Mermaid",
  ocaml: "OCaml",
  php: "PHP",
  perl: "Perl",
  python: "Python",
  r: "R",
  reasonml: "ReasonML",
  ruby: "Ruby",
  rust: "Rust",
  sql: "SQL",
  swift: "Swift",
  toml: "TOML",
  terraform: "Terraform",
  typescript: "TypeScript",
  xml: "XML",
  yaml: "YAML",
};

for (const [language, label] of Object.entries(codeLanguageLabels)) {
  unchangedTechnicalLabels.set(
    `tasks:detail.editor.languages.${language}`,
    label,
  );
  unchangedTechnicalLabels.set(
    `activity:comment.editor.codeLang.${language}`,
    label,
  );
}

const requiredPluralCategories = ["one", "two", "other"];
const allowedPluralCategories = new Set([...requiredPluralCategories, "zero"]);
// React Trans uses named components such as <link>...</link>, so HTML's
// normally-void "link" is deliberately not treated as a void component here.
const voidTags = new Set(["br", "hr", "img", "input", "wbr"]);
const placeholderPattern = /\{\{\s*(-?\s*[^{}]+?)\s*\}\}/gu;
const tokenPattern = /\{\{\s*(-?\s*[^{}]+?)\s*\}\}|<\/?[A-Za-z0-9][^<>]*>/gu;

function pluralParts(key) {
  for (const category of PLURAL_CATEGORIES) {
    const suffix = `_${category}`;
    if (key.endsWith(suffix)) {
      return { base: key.slice(0, -suffix.length), category };
    }
  }
  return null;
}

function placeholders(value) {
  return [...value.matchAll(placeholderPattern)]
    .map((match) => match[1].trim())
    .sort();
}

function countBearing(value) {
  return typeof value === "string" && placeholders(value).includes("count");
}

function equivalent(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function markup(value) {
  const stack = [];
  const tags = [];
  const interpolationContexts = [];
  const errors = [];
  for (const match of value.matchAll(tokenPattern)) {
    const token = match[0];
    if (token.startsWith("{{")) {
      interpolationContexts.push(`${match[1].trim()}@${stack.join("/")}`);
      continue;
    }
    const parsed = token.match(/^<(\/?)([A-Za-z][\w.-]*|\d+)([^<>]*?)(\/?)>$/u);
    if (!parsed) {
      errors.push(`Malformed markup token: ${token}`);
      continue;
    }
    const [, closing, name, attributes, selfClosing] = parsed;
    tags.push(token.replace(/\s+/gu, " ").trim());
    if (closing) {
      if (attributes.trim() || selfClosing)
        errors.push(`Invalid closing tag: ${token}`);
      if (stack.pop() !== name) errors.push(`Mismatched closing tag: ${token}`);
    } else if (!selfClosing && !voidTags.has(name)) {
      stack.push(name);
    }
  }
  if (stack.length) errors.push(`Unclosed tags: ${stack.join(", ")}`);
  // A missing brace or ">" must not turn an interpolation/tag into visible UI text.
  const rest = value.replace(tokenPattern, "");
  if (rest.includes("{{") || rest.includes("}}")) {
    errors.push("Malformed interpolation braces");
  }
  if (/<\/?[A-Za-z][\w.-]*(?:\s|$)/u.test(rest)) {
    errors.push("Unterminated markup tag");
  }
  return {
    tags: tags.sort(),
    interpolationContexts: interpolationContexts.sort(),
    errors,
  };
}

/** Structural completeness and likely untranslated text, not semantic/browser QA. */
export function auditHebrewCatalog(source, hebrew) {
  const sourceKeys = flattenLocale(source);
  const targetKeys = flattenLocale(hebrew);
  const errors = [];
  const untranslatedCandidates = [];
  const allowedUnchanged = [];
  const sourceFamilies = new Set(
    [...sourceKeys]
      .map(pluralParts)
      .filter(Boolean)
      .map(({ base }) => base),
  );
  const ownFamilies = new Set();
  for (const key of targetKeys) {
    const parts = pluralParts(key);
    if (
      parts &&
      sourceKeys.has(parts.base) &&
      countBearing(getValueAtKey(source, parts.base))
    ) {
      ownFamilies.add(parts.base);
    }
  }
  const families = new Set([...sourceFamilies, ...ownFamilies]);
  let sourceKeysCovered = 0;
  let unchangedTotal = 0;
  let localeSpecificPluralKeys = 0;
  const issue = (type, key, detail) => errors.push({ type, key, detail });

  for (const key of sourceKeys) {
    if (targetKeys.has(key) || ownFamilies.has(key)) sourceKeysCovered++;
    else issue("missing-key", key, "Missing source key");
  }
  for (const base of families) {
    for (const category of requiredPluralCategories) {
      const key = `${base}_${category}`;
      if (!targetKeys.has(key))
        issue(
          "missing-plural",
          key,
          "Hebrew requires one, two and other forms",
        );
    }
  }

  for (const key of targetKeys) {
    const value = getValueAtKey(hebrew, key);
    if (typeof value !== "string" || value.trim() === "") {
      issue("invalid-value", key, "Expected a nonempty translation string");
      continue;
    }
    let reference = getValueAtKey(source, key);
    if (!sourceKeys.has(key)) {
      const parts = pluralParts(key);
      if (
        !parts ||
        !families.has(parts.base) ||
        !allowedPluralCategories.has(parts.category)
      ) {
        issue(
          "extra-key",
          key,
          "Unknown source key or unsupported Hebrew plural category",
        );
        continue;
      }
      reference =
        getValueAtKey(source, `${parts.base}_other`) ??
        getValueAtKey(source, parts.base) ??
        getValueAtKey(source, `${parts.base}_one`);
      localeSpecificPluralKeys++;
    }
    if (typeof reference !== "string") {
      issue("invalid-source", key, "Expected a source string");
      continue;
    }

    if (!equivalent(placeholders(reference), placeholders(value))) {
      issue(
        "placeholder-mismatch",
        key,
        "Interpolation names or multiplicity differ from source",
      );
    }
    const sourceMarkup = markup(reference);
    const targetMarkup = markup(value);
    for (const detail of sourceMarkup.errors)
      issue("invalid-source-markup", key, detail);
    for (const detail of targetMarkup.errors)
      issue("invalid-markup", key, detail);
    if (!equivalent(sourceMarkup.tags, targetMarkup.tags)) {
      issue(
        "markup-mismatch",
        key,
        "Markup tags or attributes differ from source",
      );
    }
    if (
      !equivalent(
        sourceMarkup.interpolationContexts,
        targetMarkup.interpolationContexts,
      )
    ) {
      issue(
        "interpolation-markup-mismatch",
        key,
        "An interpolation moved into or out of its enclosing markup",
      );
    }

    const unchanged = reference === value;
    const allowlisted = unchangedTechnicalLabels.get(key) === value;
    const visibleText = value
      .replace(placeholderPattern, "")
      .replace(/<[^>]*>/gu, "");
    const englishWithoutHebrew =
      /[A-Za-z]/u.test(visibleText) && !/\p{Script=Hebrew}/u.test(visibleText);
    if (unchanged) unchangedTotal++;
    if (unchanged && allowlisted) allowedUnchanged.push({ key, value });
    if (!allowlisted && (unchanged || englishWithoutHebrew)) {
      untranslatedCandidates.push({
        key,
        value,
        reason: unchanged
          ? "Unchanged source text outside the exact allowlist"
          : "Latin text with no Hebrew outside the exact allowlist",
      });
    }
  }

  return {
    ok: errors.length === 0 && untranslatedCandidates.length === 0,
    counts: {
      sourceKeys: sourceKeys.size,
      targetKeys: targetKeys.size,
      sourceKeysCovered,
      localeSpecificPluralKeys,
      pluralFamilies: families.size,
      unchangedTotal,
      allowedUnchanged: allowedUnchanged.length,
      untranslatedCandidates: untranslatedCandidates.length,
      structuralErrors: errors.length,
    },
    requiredPluralCategories,
    errors,
    untranslatedCandidates,
    allowedUnchanged,
  };
}

async function main() {
  const [source, hebrew] = await Promise.all([
    readJson(path.join(i18nDir, "en-US.json")),
    readJson(path.join(i18nDir, "he-IL.json")),
  ]);
  const report = auditHebrewCatalog(source, hebrew);
  if (process.argv.includes("--json")) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(`he-IL: ${report.ok ? "PASS" : "FAIL"}`);
    console.log(
      `Source keys covered: ${report.counts.sourceKeysCovered}/${report.counts.sourceKeys}`,
    );
    console.log(
      `Hebrew entries: ${report.counts.targetKeys}; additional plural forms: ${report.counts.localeSpecificPluralKeys}; plural families: ${report.counts.pluralFamilies}`,
    );
    console.log(
      `Unchanged values: ${report.counts.unchangedTotal}; exact technical allowlist: ${report.counts.allowedUnchanged}; untranslated candidates: ${report.counts.untranslatedCandidates}`,
    );
    console.log(`Structural errors: ${report.counts.structuralErrors}`);
    for (const error of report.errors)
      console.error(`  ${error.type}: ${error.key} — ${error.detail}`);
    for (const candidate of report.untranslatedCandidates)
      console.error(`  untranslated: ${candidate.key} — ${candidate.value}`);
    console.log(
      "This checks catalog integrity only. Semantic review and browser RTL coverage remain separate.",
    );
  }
  process.exitCode = report.ok ? 0 : 1;
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  await main();
}
