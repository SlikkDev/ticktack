# TickTack mobile apps

Capacitor shell that packages the web app in `apps/web` as native iOS and
Android apps. The apps bundle a web build and talk to a hosted TickTack API
over HTTPS; they do not run the API or database on the device.

## How it works

- `pnpm --filter @kaneo/web build:native` runs `vp build --mode native`. Vite
  loads `apps/web/.env.native`, which bakes in the API and client origins
  (there is no nginx placeholder substitution inside an app bundle). Override
  them in `apps/web/.env.native.local`, for example
  `VITE_API_URL=http://10.0.2.2:1337` for an Android emulator against a local
  API (that also needs `server.cleartext` in `capacitor.config.ts`).
- `cap sync` copies `apps/web/dist` into `android/` and `ios/` and wires the
  native plugins (`@capacitor/app`, `@capacitor/preferences`).
- Inside the shell the page origin is `capacitor://localhost` (iOS) or
  `https://localhost` (Android), so the API's session cookie would be a
  third-party cookie that WebViews withhold. The app therefore signs in with
  Better Auth's bearer plugin instead: every request to the API origin carries
  the session token (`apps/web/src/lib/native/api-auth.ts`), responses that
  issue a token store it with `@capacitor/preferences`, and WebSocket upgrades
  offer it as the `kaneo.bearer.<base64url(token)>` subprotocol
  (`apps/api/src/ws/bearer-protocol.ts`). Browsers keep using cookies; none of
  this runs on the web.
- The app pads the iOS and Android safe areas itself (`apps/web/src/index.css`,
  `html[data-native-platform]`) and keeps the status bar legible for the active
  theme through Capacitor's `SystemBars` plugin.

## Server configuration

The API must allow the WebView origins alongside the web origin. `CORS_ORIGINS`
replaces the `KANEO_CLIENT_URL` default, so list all of them:

```dotenv
CORS_ORIGINS=https://ticktack.slikk.io,capacitor://localhost,https://localhost
```

That list feeds HTTP CORS, the WebSocket origin check and Better Auth's trusted
origins. Nothing else changes on the server.

## Requirements

- Node 24 and pnpm (same as the rest of the repository).
- Android: Android Studio with SDK 36, JDK 21 (Gradle 8.14, Android Gradle
  plugin 8.13).
- iOS: macOS with Xcode 16 or newer. The project uses Swift Package Manager;
  CocoaPods is not needed.

## Build and run

```bash
pnpm install
pnpm --filter @kaneo/mobile build        # web build in native mode + cap sync
pnpm --filter @kaneo/mobile open:android # Android Studio
pnpm --filter @kaneo/mobile open:ios     # Xcode
```

`run:android` and `run:ios` build and deploy to a connected device or emulator
through the Capacitor CLI; `doctor` checks the local toolchain. Re-run `sync`
(or `build`) after every web change or plugin install. Capacitor-generated
files such as `android/capacitor.settings.gradle` and
`ios/App/CapApp-SPM/Package.swift` point at the pnpm store and are rewritten by
`cap sync`; commit them as generated.

### Live reload during development

Point the shell at a Vite dev server instead of the bundled assets, then
revert before building a release:

```ts
// capacitor.config.ts
server: { url: "http://192.168.1.10:5173", cleartext: true }
```

## Signing and release

Signing is deliberately not committed. For Android, create a keystore and
configure `signingConfigs` in `android/app/build.gradle`, or sign the AAB in
Android Studio. For iOS, select your team under Signing & Capabilities in
Xcode. Bump `versionCode`/`versionName` (Android) and the marketing and build
versions (Xcode) per release. The app id is `io.slikk.ticktack`.

## Links that open the app

The Android manifest already claims `https://ticktack.slikk.io` links; the app
routes an opened link to the matching in-app page. To make the links open
automatically:

1. Publish `https://ticktack.slikk.io/.well-known/assetlinks.json` with the
   release signing certificate fingerprint. The bundled nginx configuration
   currently answers `/.well-known/` with 404 except for the MCP OAuth
   documents, so the file needs its own `location` block.
2. For iOS, add the Associated Domains capability with
   `applinks:ticktack.slikk.io` in Xcode and publish
   `https://ticktack.slikk.io/.well-known/apple-app-site-association`.

## Known limitations

- Sign in with email and password, or with an emailed code, works in the app.
  Magic links confirm only from the web origin, passkeys need a browser and
  OAuth providers finish in the system browser, so those flows stay on the
  web for now.
- Images in task descriptions that come from private object storage are
  loaded by the WebView without the bearer token and will not render inside
  the app; public project assets and avatars are unaffected.
- The session token lives in app-sandboxed preferences, not the keychain.
  Android backups exclude it (`allowBackup="false"`); iOS backups include it.
- iOS builds and device behaviour were not exercised while adding this
  package; the project was generated on Linux and only the web build, sync and
  tests ran. Validate on real devices before shipping.
