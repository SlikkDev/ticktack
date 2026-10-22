# TickTack · טיקטק

TickTack is SlikkDev's Hebrew-first fork of [Kaneo](https://github.com/usekaneo/kaneo).
The upstream MIT license and copyright notice in `LICENSE` are retained unchanged.

## Provenance

- Upstream stable release: `v2.46.2`, published 2026-10-12.
- Baseline commit: `46ef6f78da1f0c9630d88c56f1686ebfc8de7beb`.
- Fork: https://github.com/SlikkDev/ticktack
- The fork uses an independent clone of the upstream repository.
- React 19, Tailwind 4, TanStack Router/Query, i18next, Tiptap 3 and dnd-kit.
- Node 24, Hono, Better Auth, Drizzle and PostgreSQL.
- Bundled app serves port 5173. API and database remain private.

## Deployment boundary

Intended hostname: `ticktack.slikk.io`. New isolated Coolify application, PostgreSQL
database, network and volumes only. No changes to existing applications.
External mail, integrations and analytics remain disabled until explicitly configured.
Registration must remain closed until the owner has claimed the initial account.

Use dedicated database credentials and an authentication secret. Create the
initial owner account privately before enabling the public hostname, and keep
registration closed afterward. Configure any external services separately.
No production secrets belong in this repository.

GitHub Actions are disabled on this fork because inherited upstream workflows use
paid runners and external notification integrations. Run validation locally and
build the pinned image on the authorized VPS; do not enable those workflows
without reviewing their cost and notification destinations.

## Mobile apps

`apps/mobile` wraps the web app as Capacitor iOS and Android apps that use the
hosted API with bearer tokens. The API needs `CORS_ORIGINS` to list the web
origin plus `capacitor://localhost` and `https://localhost`. See
`apps/mobile/README.md`.

## Verification

See `docs/ticktack-coverage.md` for the explicit coverage inventory and open work.
Catalog parity alone is not proof of complete RTL support.
