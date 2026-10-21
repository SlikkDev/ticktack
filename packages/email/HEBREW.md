# Hebrew transactional email coverage

TickTack extends the upstream email package with Hebrew (`he` and `he-IL`)
while retaining English and the existing supported translations. The upstream
MIT license is preserved at the repository root.

| Surface | Hebrew copy and integration | Direction handling |
| --- | --- | --- |
| One-time sign-in code | Subject, preview, instructions, expiry, request details, security notice, footer | RTL shell and tables; LTR digit table; isolated code in subject and plain-text hint |
| Magic sign-in link | Subject, preview, instructions, fallback URL label, request details, security notice, footer | RTL shell; LTR fallback URL, account address, and instance |
| Password reset | Subject, preview, named greeting, instructions, fallback URL label, request details, security notice, footer | RTL shell; isolated name; LTR URL, account address, and instance |
| Workspace invitation | Subject, preview, inviter text, action, account guidance, role, expiry, footer; API resolves Hebrew catalog | Isolated mixed-language names and subject values; RTL details and card; LTR recipient and instance |
| Notification | Preview, actions, priority labels, Gregorian dates, preference footer; API generates Hebrew text for all nine standard notification types; exact canonical built-in column slug/name pairs display in Hebrew | RTL board/card, mirrored spacing and alignments; isolated task identifier, title, labels, initials, and column name |
| Trial reminder | Subject, active/expired state, countdown, progress, billing action, self-host explanation, owner footer; scheduler uses stored recipient locale | RTL progress and shell; isolated workspace/email; Hebrew singular, dual, and plural countdowns |

Shared components set `lang` and `dir`, pass direction into nested presentation
tables, and emit physical inline margin/padding/alignment fallbacks for email
clients. URLs, identifiers, and verification digits retain LTR ordering.
Inserted names use direction isolation in HTML and plain text. Gregorian date
formatting uses the existing UTC policy.

The footer links to the TickTack instance, labels upstream documentation as
Kaneo documentation, and links an explicit “Based on Kaneo” attribution. It does
not present upstream privacy terms as this instance's privacy policy.

## Validation

Validated on 2026-10-20:

- Package TypeScript compilation, including declaration and JavaScript output.
- Final full package tests: 62 tests passed, including all six Hebrew HTML and
  plain-text templates, both invitation/catalog parity checks, OTP digit order,
  URL/identifier isolation, locale variants, priorities, dates, and countdowns.
- This includes 12 Hebrew/English built-in/custom column cases and both localhost
  SMTP transport tests. The final full run supersedes the earlier checkpoint
  where permission review prevented rerunning the socket tests.
- API copy tests: 3 files, 22 tests passed for auth subjects, invitation subjects
  and roles, all nine standard notification types, metadata isolation,
  lead-time pluralization, and custom-notice preservation.
- Following authentication locale propagation fixes, the expanded API selection,
  copy, and formatting suite passed 5 files / 31 tests. The full API TypeScript
  check also passed after adding column slugs to email task data.
- Scoped formatting and lint checks: 59 files passed without warnings.
- Final repository typecheck, formatting and lint passed. The full API integration
  suite passed 1,621 tests, including authentication locale propagation,
  invitation delivery failure/retry and localized trial-reminder subjects.
- SMTP transport tests used an ephemeral localhost fake relay only. No real
  messages were sent and no delivery channel was enabled.

Local example previews are in `packages/email/.cache/hebrew-previews/index.html`
after the validation run. They include one HTML and one plain-text example for
each template and use local assets. The cache is not a shipped artifact.

## Remaining verification and boundaries

- Browser inspection of the six previews and actual mail-client verification
  (including narrow screens, dark mode, Outlook, Gmail, and Apple Mail) remain.
  Automated HTML checks are not proof of universal client rendering.
- This work does not translate user-authored content, workspace/project names,
  custom board column names, labels, or custom notification payloads. Existing
  stored names are preserved. Only exact pairs for the four built-in column
  slugs and canonical English names are translated at display time.
- Direct template calls without a locale retain English. Authentication email
  now resolves stored recipient preference, then an allowlisted request hint,
  then the Hebrew instance default. Unregistered invitations use that Hebrew
  default. Notification/trial calls still use stored recipient locale.
- Real authentication, invitation, notification, and trial delivery flows have
  not been triggered. Billing, SMTP, and external channels remain controlled by
  their existing configuration.
