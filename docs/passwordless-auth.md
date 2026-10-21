# Invite-only passwordless authentication

TickTack can use email magic links and WebAuthn passkeys while public registration
stays closed. The default authentication mode remains `legacy` for existing
installations. Enabling SMTP alone does not switch authentication mode.

## Requirements and configuration

Set these variables only after testing mail delivery and preparing owner access:

```dotenv
AUTH_MODE=passwordless
DISABLE_REGISTRATION=true
DISABLE_PASSWORD_REGISTRATION=true
DISABLE_GUEST_ACCESS=true
DISABLE_LOGIN_FORM=false
KANEO_CLIENT_URL=https://tasks.example.com
PASSKEY_RP_ID=tasks.example.com
SMTP_HOST=mail.example.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_FROM=tasks@example.com
```

Store SMTP credentials and the authentication secret in protected deployment
settings, never in source control. The existing SMTP configuration supports
STARTTLS on port 587 as well. Passwordless mode requires an explicit RP ID matching
the client hostname and HTTPS; localhost development is the only HTTP exception.
`ENABLE_PASSKEYS=true` can enable passkey enrollment during a legacy-mode rollout
once mailbox ownership has been established. It also requires `PASSKEY_RP_ID`.

Passwordless mode disables password signup, sign-in, reset and setting routes,
email OTP, anonymous access, and social/OAuth login paths. API keys and approved
CLI/MCP authorization remain supported; they are not alternative public signup
paths. Workspace invitation permission checks remain enforced by the API.

## Joining and signing in

A new account must have a pending, unexpired invitation for the mailbox it proves.
Requesting a link does not reveal whether an address belongs to a user or invite.
Invitations are checked again at account creation. An invitation alone does not
prove control of its email address. Existing users can request links directly.

Magic links expire after five minutes and are single use. Only hashed tokens are
stored in passwordless mode. The token travels in the URL fragment, is removed
before telemetry starts, and is submitted only after an explicit confirmation
click. Email scanner GET requests cannot redeem the token. Confirmation requires
the configured web origin. IP and mailbox limits constrain repeated requests.

Passkeys require user verification. Adding, renaming, or deleting a passkey needs
a verified mailbox and a cookie session created within the previous five minutes.
API keys cannot manage passkeys. Enroll more than one authenticator or a synced
passkey and retain mailbox access: magic links provide recovery when a device is
lost. A compromised mailbox can use that recovery path, so protect the mailbox
with strong authentication as well.

## Existing accounts and staged rollout

Back up the database and retain the current image before applying the additive
migrations. Deploy first in `legacy` mode to verify invitation behavior, mail
configuration, and application health while preserving existing owner login.
Test the complete replacement login and recovery flow before disabling passwords.

The first successful mailbox verification of an unverified account is an account
ownership transition: Better Auth removes its password credential and existing
sessions; TickTack also revokes existing passkeys, API keys, pending device grants,
MCP authorization codes, and live WebSocket access. Email address changes revoke
these access paths too. Explain and approve this effect before migrating an owner.
New credentials and sessions issued after that transition can be used normally.

After the owner verifies the mailbox, the owner must enroll and test their own
passkeys through the normal browser flow. Verify a second-device or mailbox
recovery route, then explicitly enable `AUTH_MODE=passwordless`. Verify public
signup stays closed, invitation acceptance works, and existing project access
remains correct. Do not send real invitations as an installation test without
recipient authorization.

Switching the image or returning to `legacy` mode does not recreate credentials
or sessions already revoked. Rollback must preserve newer project data; restoring
a whole database backup can discard work performed since the backup. Prefer a
forward repair or verified mailbox login over restoring obsolete credentials.

## Hostname changes

Passkeys are bound to the configured RP ID. This implementation intentionally
requires the exact client hostname, rather than sharing a parent-domain credential
across applications. Moving to a different hostname requires users to sign in via
email and enroll new passkeys. A synced passkey helps across devices, not across
unrelated RP IDs. Plan the hostname before widespread enrollment.

## Verification limits

Integration tests exercise signed WebAuthn registration and authentication,
required user verification, origins/RP IDs, invitation checks, replay prevention,
rates, and concurrent ownership changes with synthetic accounts. These tests do
not replace testing real authenticators, email clients, recovery procedures, or
supported browsers in the deployment environment.
