# Settings and workspace RTL audit

Completed on 2026-10-20 within the assigned settings, shared, team, custom-fields, my-work, onboarding, import and workspace-switcher surfaces.

## Implemented

- Replaced physical horizontal spacing, alignment and placement with logical CSS utilities.
- Mirrored navigation, back and directional action icons in RTL. The expanded project disclosure still points down.
- Changed the task-detail custom-field popover to the library's `inline-start` side.
- Isolated task keys, project keys, API keys, email addresses, URLs and token inputs from surrounding Hebrew text.
- Added automatic direction to editable task titles, searches and custom-field text.
- Isolated mixed-language custom-field labels/values, names and onboarding previews.
- Reused `common:modals.createProject.successToast` for the previously literal project-created toast. No new catalog keys were needed.
- Added locale-aware custom-field numeric display without changing stored values or edit syntax. Invalid and non-finite strings remain unchanged. Formatting accepts exact numeric strings and bigint rather than coercing display values through Number, with up to 21 significant digits.
- Made custom-field display components subscribe to language changes and pass the current locale explicitly.

## Verification

- Assigned component suites plus shared formatting: 57 files and 270 tests passed.
- After the final reactive-locale change, the affected custom-field and formatting subset passed again: 7 files and 35 tests, including the newly added locale test.
- Web application and tooling TypeScript checks passed, including a rerun after the final change.
- Scoped formatting/lint check passed on all 43 implementation/test files. The final six modified files passed again after the locale change.
- `git diff --check` passed.
- The final static scan found no remaining physical horizontal spacing/alignment utility or physical popover side in the assigned component directories.
- Consolidated Chromium acceptance subsequently passed 14 mobile checks at
  390×844, including Hebrew/English preference reload, sidebar placement, focus
  containment and return, mixed form values, and numeric display/edit preservation.

## Remaining coverage

- The consolidated mobile/editor checks cover representative layout, clipping,
  keyboard/focus and popover interactions. Every possible settings state,
  physical device, browser and assistive technology has not been exercised.
- Subsequent centralized API error translation and import diagnostic disclosure
  work resolved the audited direct-message paths; see [the error audit](errors.md).
  Arbitrary provider diagnostics and user-authored content remain source text.
- Intentional technical literals remain: service names, URL/API-token examples, project-key examples and keyboard key labels.
- The onboarding animation's `rect.left` remains physical because it measures browser viewport coordinates.
- Numeric display may round values beyond 21 significant digits; the full stored/edit value is preserved.

## Exact implementation/test files

Paths below are relative to the repository root.

```text
apps/web/src/components/custom-fields/card-field-chip.tsx
apps/web/src/components/custom-fields/card-field-list.tsx
apps/web/src/components/custom-fields/card-field-overflow-row.tsx
apps/web/src/components/custom-fields/custom-field-chip.tsx
apps/web/src/components/custom-fields/custom-field-popover.tsx
apps/web/src/components/custom-fields/custom-field-row.tsx
apps/web/src/components/custom-fields/format-custom-field-value.test.ts
apps/web/src/components/custom-fields/format-custom-field-value.ts
apps/web/src/components/custom-fields/option-field-editor.tsx
apps/web/src/components/custom-fields/text-field-editor.tsx
apps/web/src/components/import/connect-forms/jira-connect-form.test.tsx
apps/web/src/components/import/connect-forms/secret-input.tsx
apps/web/src/components/import/import-run-history-row.tsx
apps/web/src/components/import/import-step-layout.tsx
apps/web/src/components/my-work/assigned-task-row.tsx
apps/web/src/components/onboarding/onboarding-progress.tsx
apps/web/src/components/onboarding/preview/preview-sidebar.tsx
apps/web/src/components/onboarding/preview/preview-task-card.tsx
apps/web/src/components/onboarding/preview/workspace-preview.tsx
apps/web/src/components/onboarding/project-step.tsx
apps/web/src/components/settings/api-keys/api-key-created-dialog.tsx
apps/web/src/components/settings/api-keys/api-key-row.tsx
apps/web/src/components/settings/nav/settings-nav-project.tsx
apps/web/src/components/settings/nav/settings-sidebar-header.tsx
apps/web/src/components/settings/notifications/channels/channel-row.tsx
apps/web/src/components/settings/notifications/channels/email-channel-row.tsx
apps/web/src/components/settings/profile/delete-account-section.tsx
apps/web/src/components/settings/profile/profile-details-section.tsx
apps/web/src/components/settings/project-general/move-project-row.tsx
apps/web/src/components/settings/project-general/project-details-section.tsx
apps/web/src/components/settings/project-general/project-icon-picker.tsx
apps/web/src/components/settings/project-visibility/public-link-url-row.tsx
apps/web/src/components/settings/settings-header.tsx
apps/web/src/components/settings/workspace-general/current-owner-row.tsx
apps/web/src/components/settings/workspace-general/transfer-ownership-row.tsx
apps/web/src/components/shared/modals/create-project-modal.tsx
apps/web/src/components/shared/modals/create-task-modal.tsx
apps/web/src/components/team/invitation-link-field.tsx
apps/web/src/components/team/invite-team-member-modal.tsx
apps/web/src/components/team/members-table.tsx
apps/web/src/components/workspace-switcher.tsx
apps/web/src/lib/format.ts
apps/web/src/lib/format.test.ts
```
