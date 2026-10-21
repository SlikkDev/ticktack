# TickTack Hebrew and RTL coverage

Implementation and local acceptance were verified on 2026-10-20. Deployment
acceptance is a separate gate and remains pending at this source checkpoint.
This inventory describes evidence, not a claim of universal 100% coverage.

Scope: the v2.46.2 responsive web application and transactional templates.
English and the upstream locales remain available. Hebrew uses localized
Gregorian dates. User-authored names, comments, custom statuses and imported
content are preserved.

| Surface | Implementation | Verification and limits |
| --- | --- | --- |
| Catalog | All 3,045 source keys translated; 59 Hebrew plural families | Strict integrity and nine mutation tests pass. Exactly 87 unchanged technical terms are allowlisted. All retained locale catalogs have parity. Individual translations have not received an independent native-speaker editorial review. |
| Branding and attribution | TickTack names, logo and icons; unchanged upstream MIT license included in repository and image | Production build and rendered auth/onboarding/navigation checked in Chromium. |
| Document, portals, menus and dialogs | Prepaint language/direction, Base UI/Radix providers, logical CSS | Component tests and desktop/mobile overlays, focus containment, Escape and focus return pass. |
| Navigation and mobile drawers | Mirrored sidebar placement and directional navigation | Hebrew and English mobile layout, persistence and keyboard checks pass at 390×844. |
| Forms, errors, empty/loading states | Hebrew catalog, accessible spinner, safe API error mapping and separate import diagnostics | Full regression passes; browser checks include auth empty forms, profile email, mixed project/label forms and numeric fields. See [error audit](audits/errors.md) for mapped paths and boundaries. Every possible network/provider failure has not been induced. |
| Boards and drag/drop | Directional movement and keyboard behavior; canonical built-in status display translation | Hebrew/English pointer and keyboard moves persist after reload in the durable schedule suite. Custom status names remain unchanged. |
| Lists, filters and task details | Logical layout, status labels, localized dates and isolated identifiers | Component/regression suites pass; desktop task rail and task detail/editor flows checked. Exhaustive combinations of filters and permissions remain outside browser coverage. |
| Rich text and comments | Automatic paragraph direction, live checklist permission guards, table navigation/resizing and viewport-clamped overlays | All 15 isolated editor browser checks pass: mixed content/comments, permission transitions, keyboard checkbox toggle, desktop/mobile slash/link/table overlays, short-viewport active-command visibility, and saved table/image sizing. |
| IDs, URLs, code, email and OTP | LTR isolation within Hebrew layout; natural direction for user text | Shared component/email tests and mixed browser fixtures pass. |
| Calendar, dates and numbers | Hebrew DayPicker/weekends, Intl date/number formatting; raw numeric edit values retained | Locale/unit checks pass. Mobile numeric display and unchanged edit values verified. Calendar visual states have component coverage, but not an exhaustive browser matrix. |
| Gantt | Directional drag/resize and keyboard movement; touch targets | Three durable schedule browser tests pass: Hebrew/English board/Gantt persistence and emulated phone touch dragging plus both resize handles. |
| Transactional email | Six Hebrew templates and nine standard notification types; stored/request/default locale rules | All 62 package tests and full API integration pass. Only localhost fake SMTP used. Actual Gmail, Outlook, Apple Mail and delivery remain unverified; see [email coverage](../packages/email/HEBREW.md). |
| Locale switching | Hebrew default, retained English, storage-safe preference and account locale authority | English signup with blocked local storage persists after reload. Both directions and saved preferences pass mobile/browser checks. |
| Mobile and keyboard access | Responsive logical layout, focus containment, visible selected commands | Fourteen mobile acceptance checks pass at 390×844 plus editor short-viewport and native Chromium touch emulation. Physical devices and screen readers remain unverified. |
| Deployment | Isolated Compose definition, pinned PostgreSQL digest, resource limits, health checks, closed registration flags | Compose validates. Empty dedicated Coolify project exists; image/service, private owner bootstrap, backup/restore and public TLS acceptance remain pending. |

## Test evidence

- Full repository regression: **4,273 passed**.
- Full API integration: **1,621 passed across 144 suites**.
- The subsequent integer table-width normalization passed five focused tests and
  a fresh production web build, followed by all 13 editor browser checks.
- Final repository TypeScript, formatting and lint checks passed.
- Strict Hebrew check: 3,045/3,045 source keys, 3,104 Hebrew entries, no structural
  errors or untranslated candidates outside the explicit technical allowlist.
- Isolated Chromium browser suites: editor 15/15, mobile 14/14, schedule 3/3,
  blocked-storage English signup 1/1. Earlier desktop schedule acceptance also
  covered the RTL properties rail and today centering.

The nonempty table-cell entry correction additionally passed thirteen focused unit
tests, the web typecheck, repository lint and a fresh local web build. All 15
editor browser checks passed, including both arrows across Hebrew, English and
mixed-direction nonempty cells, mixed-direction paragraphs within one cell,
and the next character movement. The interrupted
run failed to render because the preview used the deployment API placeholder;
rebuilding with the loopback API URL resolved that harness configuration.
Evidence: `.cache/recovery-multiline-unit.log`, `.cache/recovery-multiline-typecheck.log`,
`.cache/recovery-multiline-lint.log`, `.cache/recovery-multiline-build.log`, and
`.cache/editor-acceptance/recovery-multiline-resumed/results.json`.

Local evidence is ignored by Git: `.cache/release-tests-final.log`,
`.cache/release-integration-final.log`, `.cache/pinned-typecheck.log`,
`.cache/pinned-lint.log`, `.cache/pinned-hebrew.log`,
`.cache/editor-acceptance/isolated-final/`,
`.cache/mobile-acceptance/final-resumed/`, `.cache/schedule-final.log` and
`.cache/auth-storage-browser.log`. Browser fixtures were synthetic; external
requests were blocked and no real emails or invitations were sent.

The three initially failing integration areas were compared with an exact
upstream archive. Test mocks were updated for the new language behavior; a
password-file fixture required a nonempty synthetic local password. The final
full run passed. See [upstream comparison](audits/upstream-test-comparison.md).

## Release boundaries

An exact-commit independent review and deployment smoke tests remain gates before
publication. GitHub Actions are disabled because inherited workflows use paid
runners and external notifications. No unrelated deployment has been changed.

Local Chromium coverage is not evidence for Safari, Firefox, real phones,
screen-reader usability or universal email-client rendering. Attachments needing
S3, SMTP, OAuth, external integrations and billing are not configured or tested
against live third-party services.
