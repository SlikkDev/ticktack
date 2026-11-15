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

## Which commit is running

`GET /api/health` answers `{"status":"ok","commit":"<sha>","version":"<name>"}`
with the commit and release name baked into the image, or `null` when the image
was built without them. Build the reviewed commit with both:

```sh
git checkout <reviewed commit>
docker build -f Dockerfile.kaneo \
  --build-arg SOURCE_COMMIT="$(git rev-parse HEAD)" \
  --build-arg TICKTACK_VERSION="ticktack-$(git show -s --format=%cs HEAD)" \
  -t "ticktack:$(git rev-parse --short=12 HEAD)" .
```

Use the same immutable tag as `TICKTACK_IMAGE`, then check the live site with
`curl https://ticktack.slikk.io/api/health`. The image also carries the commit
as the `org.opencontainers.image.revision` label. A site that answers only
`{"status":"ok"}` runs an image built before this was added. The page date and
the import screen do not show which commit runs; for an older image, compare
the public `GET /api/openapi` paths with `apps/docs/openapi.json` at each commit.

## Mobile apps

`apps/mobile` wraps the web app as Capacitor iOS and Android apps that use the
hosted API with bearer tokens, and ships Apple Watch and Wear OS companions
that receive the session from the phone and read `GET /api/watch/summary`.
Siri App Intents on iOS and Google Assistant App Actions on Android create
tasks, start and stop timers and read out what is next; Android fulfils them
through the web app's `/dashboard/assistant/<action>` route. The API needs
`CORS_ORIGINS` to list the web origin plus `capacitor://localhost` and
`https://localhost`. See `apps/mobile/README.md`.

## Verification

See `docs/ticktack-coverage.md` for the explicit coverage inventory and open work.
Catalog parity alone is not proof of complete RTL support.
