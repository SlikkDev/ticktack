# Upstream integration comparison

Compared TickTack with upstream v2.46.2, commit
`46ef6f78da1f0c9630d88c56f1686ebfc8de7beb`, on 2026-10-20.

The baseline was extracted with `git archive` into an ignored directory. It has
no Git object database. Dependency files were copied from the existing install;
workspace links resolve inside the baseline directory, and required packages
were compiled from baseline sources. The Node version and PostgreSQL process
were the same. A separate disposable database ending in `_test` isolated the
baseline from TickTack's integration and browser fixtures. SMTP remained mocked.

| Case | Exact upstream | TickTack before fixture fix | TickTack after fixture fix |
| --- | --- | --- | --- |
| Trial reminders | 12 passed | 10 failed because the email mock omitted the newly imported localized subject helper | 16 passed, including explicit Hebrew, English and missing-locale cases |
| Invitation delivery failure/retry | 1 passed | 1 failed because the expected English role label was now Hebrew | 1 passed with explicit Hebrew locale and role |
| File-backed secrets, passwordless test URL | 2 passed, 1 failed: the fixture writes an empty password file | Same failure | No source/test change; corrected the environment input |
| All three baseline suites, nonempty synthetic test password | 16 passed | Not applicable | Full TickTack integration rerun: 1,621 passed across 144 suites |

The trial-reminder failures were introduced by the unupdated TickTack test mock.
They were not upstream scheduler business-logic failures. The corrected tests
retain recipient, urgency ordering, per-run limits, shared budgets, audit and
duplicate-prevention assertions. The invitation test retains delivery-failure,
pending-state and retry assertions.

The password-file failure was an environment mismatch reproduced on both trees.
Supplying a nonempty synthetic password in the local connection URL satisfied the
fixture. No PostgreSQL authentication settings or real credentials were changed.

Evidence, kept outside Git:

- `.cache/release-integration.log`: initial full TickTack run, 1,605 passed and 12 failed.
- `.cache/baseline-integration.log`: baseline reproduction, 15 passed and the one password-file failure.
- `.cache/baseline-integration-with-password.log`: baseline 16/16 passed.
- `.cache/release-integration-final.log`: subsequent full TickTack integration run.
