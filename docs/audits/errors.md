# Hebrew API, authentication and import error audit

This is a source and automated-test inventory, not a claim of complete browser verification.

## Implemented

- `HttpError` localizes both response-derived and directly constructed messages. The source audit found 153 fetcher files calling `HttpError.fromResponse` and 5 fetcher files constructing `HttpError` directly. These sets overlap.
- `ApiClientError` now retains BetterAuth code, numeric status and validation issues in 45 BetterAuth fetcher/hook files. Two MCP fetchers also use the wrapper. Display messages use the active language; the original message remains available to internal error classifiers.
- The code map contains 58 codes and 10 HTTP statuses. Known authentication, permission, integration-authentication, account-ownership and subscription restrictions receive specific Hebrew guidance.
- Standard validation issues retain required-field, string/array length, numeric bounds, email/URL, integer and available-option guidance. Only recognized field labels and numeric constraints enter translated output. Unknown field names and opaque custom validation messages use safe generic validation copy.
- Password sign-in, email-code sending, guest sign-in, provider sign-in, OTP verification/resending, unknown OAuth callback errors, instance-status errors and three invitation interfaces use the presentation helper. Password signup is integrated by the parent worker.
- Workspace creation still checks the original upstream message before retrying a slug collision. Explicit slugs do not retry; generated slugs still stop after five attempts. Final failures retain code/status.
- Account deletion keeps the `SESSION_TOO_OLD` control-flow sentinel. Network/cancellation classifiers use original diagnostic wording, so localization does not alter retry behavior. Integration 401 failures remain distinct from application-session 401 failures.
- Import diagnostics recognize 19 exact generated strings and 36 structured legacy patterns, plus project-reading/saving and renamed-column messages. This covers progress counters, interruption/save errors, provider status and credential guidance, and importer warning counts/identities.
- Import names and captured provider/user identifiers use direction isolation. Unknown sanitized import diagnostics remain available in a closed, keyboard-operable “Original technical details” disclosure with Hebrew surrounding copy. Obvious stack/SQL/HTML output and credential assignments are withheld.
- `errors.en.json` and `errors.he.json` contain 128 matching keys under `common.apiErrors`. All Hebrew values contain Hebrew text; the source/translation key and interpolation-placeholder comparisons have zero mismatches.

## Fallback behavior and limits

Unknown upstream English errors are not automatically translated. Hebrew displays a safe status-specific, operation-specific or generic message. Opaque provider codes remain available on the error object for later explicit mappings. Arbitrary custom server validation prose without recognizable structured constraints may consequently receive generic validation guidance.

Nonempty English 4xx/provider wording remains unchanged. The deliberate safety exception is unknown 5xx output or obvious internal stack/SQL/HTML content, which receives a safe message. Known 5xx application codes can retain actionable translated guidance.

Unknown sanitized import/provider diagnostics may remain English inside the explicitly labeled original-details disclosure. These are original technical/user data, not a claim that every possible upstream string has a Hebrew translation. Future upstream changes to legacy English import patterns will use that disclosure until a corresponding mapping is added.

## Local invariant consumers

All five inventoried sources have now been traced to their display consumers:

| Source | Display path and resulting behavior | Preserved control flow and diagnostics |
| --- | --- | --- |
| `fetchers/task/create-task.ts`: missing selected project | `use-create-task` reaches `CreateTaskModal`, which displays `error.message`. This guard now uses `ApiClientError`; the presentation helper maps the exact known diagnostic to the existing `common:modals.createTask.selectProject` key in Hebrew. English keeps the original guidance. The other consumer, `TaskSubtasks`, already displays `tasks:subtasks.createError`. | The missing-project guard still rejects before any request. `originalMessage` retains the diagnostic; no HTTP status or provider code is invented. The modal's existing guards still prevent submission without a selected project. |
| `fetchers/task/get-description-matches.ts`: pagination did not advance | `use-description-matches` returns `isError` and a retry callback, not the diagnostic text. The board/list route displays `tasks:descriptionSearchError` and `tasks:descriptionRetry`. | Repeated cursors and empty advancing pages still stop the search without returning partial matches. The original diagnostic remains internal. Cancellation still propagates unchanged. |
| `fetchers/task/get-description-pages.ts`: version changed or pagination did not advance | `PublicProjectDescription` and `PublicTaskDetailModal` display `tasks:descriptionLoadError` and `tasks:descriptionRetry`; neither displays the raw error. | Version mismatches and repeated offsets still reject before partial text is returned. The original diagnostics and `AbortError` cancellation are unchanged. Explicit retry loads the current version. |
| `hooks/queries/task/use-public-task-description.ts`: missing selected task | With a null task, the query is disabled and `PublicTaskDetailModal` returns null. The invariant message has no display consumer. | The defensive `No task selected` guard remains unchanged for explicit refetch misuse. Tests verify that an open modal with no task renders nothing and makes no description request. |
| `fetchers/project/background.ts`: empty storage-upload error | `use-upload-project-background` handles every upload failure with `settings:projectGeneral.backgroundUploadError`. `ProjectBackgroundRow` uses that mutation's callback and never renders the raw error. English and Hebrew toast output are tested against the catalogs. | Failed storage PUT requests still throw the original empty `Error` and stop before finalization. The storage response body is not displayed, and a storage failure does not acquire application-session authentication semantics. |

No catalog keys were added for these local invariants. Internal pagination, missing-task and storage diagnostics remain internal rather than becoming translated debug text.

Promise rejections from browser/network APIs can still bypass structured API wrappers in unrelated components that render plain `Error.message`; their complete visual presentation needs the parent's remaining application/browser audit. This five-source follow-up does not claim to close that broader inventory.

## Verification

Focused suites cover locale changes, missing Hebrew resources, mapped codes/statuses, unknown safe fallbacks, validation bounds, malformed responses, original metadata, integration-vs-session 401 behavior, guest/provider failures, workspace retry limits, account-deletion session handling, import pattern translation, direction isolation, credential/internal-output withholding, and the accessible original-details disclosure.

The initial focused run passed **170 tests in 15 suites**. Both 128-key fragments were verified as merged into the parent-owned catalogs with zero key or interpolation mismatches.

The subsequent regression fix passed **61 tests in 7 suites**, including explicit English/Hebrew invitation delivery guidance, preserved original error metadata, safe 5xx text, and isolated MCP/device language-switcher mocks.

The local-invariant follow-up passed **107 tests in 10 suites**: task creation, paginated descriptions, public project/task descriptions, background uploads, both API-error helpers, description search, task creation modal and subtasks. These runs overlap and are not an aggregate test count. Targeted Vite+ formatting/lint, the full web TypeScript check and `git diff --check` passed after this follow-up.

No browser, VPS, live provider, real import, notification, payment, commit or push action was performed for this work.
