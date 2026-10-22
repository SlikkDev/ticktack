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

## Siri and Google Assistant

Both apps answer voice requests for the same four actions: create a task,
start a timer, stop the timer and "what's next". A spoken task name is matched
against the user's open assigned tasks the same way on both platforms (ticket
id, exact title, part of the title, then every word in any order), so "start a
timer on the login bug" finds `WEB-12 Fix the login bug`, and a name that fits
several tasks asks instead of guessing.

### iOS: App Intents and App Shortcuts

`ios/App/App/Intents` defines four App Intents (`CreateTaskIntent`,
`StartTimerIntent`, `StopTimerIntent`, `WhatsNextIntent`) and the
`TickTackShortcuts` provider, so the phrases work as soon as the app is
installed, with nothing to set up in the Shortcuts app: "Create a task in
TickTack", "Start a timer in TickTack", "Stop the timer in TickTack" and
"What's next in TickTack". Siri asks for whatever is missing (the title, the
project when there is more than one, the task), reads the result back, and the
same intents show up in Spotlight, the Shortcuts app and the Action button.
The intents run outside the WebView, so they call the API themselves with the
bearer token that the `NativeSession` plugin keeps in the keychain
(`ios/App/App/NativeSession`); until the app has signed in once Siri answers
"Open TickTack and sign in first." The intents need iOS 16 and the App
Shortcuts phrases iOS 17, while the app itself still runs on iOS 15. Dialog
strings and phrases are localized in English and Hebrew
(`ios/App/App/Localizable.xcstrings`, `ios/App/App/AppShortcuts.xcstrings`).

### Android: App Actions and launcher shortcuts

`android/app/src/main/res/xml/shortcuts.xml` declares Google Assistant App
Actions. Google's built-in intent catalog has nothing for tasks or timers, so
create task, start timer, stop timer and what's next are custom intents
(`custom.actions.intent.*`) with en-US query patterns in
`res/values/strings.xml`, while the built-in `GET_THING` (search) and
`OPEN_APP_FEATURE` (new task, my tasks, inbox) come with Google's grammar in
every Assistant language. Each action is fulfilled by opening a link such as
`https://ticktack.slikk.io/dashboard/assistant/create-task?title=…`, which the
web shell routes like any other app link; the web app then performs the action
with its signed-in session and shows a toast. The same file adds long-press
launcher shortcuts for new task, what's next, start timer and stop timer, with
English and Hebrew labels (`res/values-he`).

Google reviews App Actions: custom intents only work for users after the App
Actions submission in the Play Console is approved, and they only trigger when
the Assistant language is en-US. Before that, test them with the Google
Assistant plugin for Android Studio (the App Actions test tool), signed in
with the Play Console account. Gemini is replacing Assistant on new devices
and still runs App Actions; Android 16's App Functions are the successor to
add when the tooling settles.

### The assistant route

Anything that can open a link, including the Android actions above, can use
`/dashboard/assistant/<action>` in the web app, where the action is
`create-task`, `start-timer`, `stop-timer`, `whats-next`, `search` or `open`,
with optional `title`, `task`, `q` and `feature` query parameters
(`apps/web/src/lib/assistant`). The route resolves the active workspace,
performs the action through the regular API routes and lands on the relevant
page: the create-task dialog with the title filled in, the task page with a
toast when a timer started or stopped, My tasks for "what's next", or search
when a spoken task name matched nothing or several tasks. On iOS, Siri
performs the actions natively instead, so the answer can be spoken without
opening the app.

## Smart watches

Both apps ship a watch companion: an Apple Watch app in `ios/App/TickTackWatch`
(SwiftUI, watchOS 10 or newer) and a Wear OS app in `android/wear` (Compose for
Wear OS, Wear OS 3 or newer). Each shows the wearer's open tasks from every
workspace they can read, grouped into overdue, today, upcoming and no due date,
with the running timer and the unread notification count on top. From a task
the wearer can mark it done, move it to another status, or start and stop a
timer. The watch apps are for glances and quick actions; creating and editing
tasks stays on the phone.

### How the watch signs in

The watch never shows a login form. The web shell pushes the API base URL and
the current bearer token to the native `NativeSession` plugin
(`apps/web/src/lib/native/native-session.ts`) on every launch and whenever the
token changes, including sign-out. On iOS the plugin stores them for the Siri
intents (`ios/App/App/NativeSession`) and relays them over WatchConnectivity
as the application context (`ios/App/App/Watch`); on Android it writes a Wear
OS Data Layer item at `/ticktack/session`
(`android/app/src/main/java/io/slikk/ticktack/WatchSessionRelay.java`). The
plugin is part of each native project and registered by the app itself, so
`cap sync` neither installs nor removes it.

The watch stores the token (Keychain on watchOS, app-private preferences on
Wear OS) and calls the API directly over HTTPS, using the phone's connection
when it has none of its own. If no session has arrived yet, the watch asks the
phone for one, which wakes the phone app's relay. A `401` from the API clears
the stored session and shows the pairing screen until the phone signs in again.

The watch reads `GET /api/watch/summary`, a compact cross-workspace view of the
caller's assigned tasks, and performs quick actions through the regular
`PUT /api/task/status/{id}`, `POST /api/time-entry` and
`PUT /api/time-entry/{id}` routes, so every change passes the same permission
checks and emits the same activity and realtime events as the web app. No extra
server configuration is needed: native clients send no `Origin`, so CORS does
not apply. API keys need read scope on workspaces, projects and tasks to call
the summary route.

### Building the watch apps

- iOS: the Xcode project has a `TickTackWatch` target (bundle id
  `io.slikk.ticktack.watchkitapp`) that the `App` target embeds, so
  `cap open ios` and a normal archive include the watch app. Select the same
  team for both targets under Signing & Capabilities. The watch app requires
  the phone app (`WKRunsIndependentlyOfCompanionApp` is `NO`).
- Android: `settings.gradle` includes the `:wear` module, which builds a
  separate APK with the same application id. Publish it on the Wear OS track
  of the same Play listing and sign it with the phone app's key; the Data
  Layer only connects apps that share both. Kotlin and the Compose compiler
  plugin are declared in `android/build.gradle`; Compose, Play services and
  the Wear SDK versions live in `android/variables.gradle`.
- Strings are localized in English and Hebrew
  (`ios/App/TickTackWatch/Localizable.xcstrings`,
  `android/wear/src/main/res/values-he`). Add other languages there; the web
  app's i18n files do not reach the watches.

Neither watch app has been built or run yet: the package was written on Linux
without Xcode or the Android SDK. Open the projects in Xcode and Android
Studio, resolve any toolchain prompts, and test on a watch or simulator before
shipping. Complications and tiles, a notifications list and an offline cache
are natural follow-ups.

## Known limitations

- Sign in with email and password, or with an emailed code, works in the app.
  Magic links confirm only from the web origin, passkeys need a browser and
  OAuth providers finish in the system browser, so those flows stay on the
  web for now.
- Images in task descriptions that come from private object storage are
  loaded by the WebView without the bearer token and will not render inside
  the app; public project assets and avatars are unaffected.
- The web shell keeps the session token in app-sandboxed preferences, not
  the keychain. Android backups exclude it (`allowBackup="false"`); iOS
  backups include it. On iOS the `NativeSession` plugin keeps a second copy in
  the keychain for Siri.
- The Siri intents and the Android App Actions were written without Xcode or
  the Android SDK and have not run on a device. Custom App Actions understand
  en-US only and need Google's review before they work outside the test tool;
  see "Siri and Google Assistant" above.
- iOS builds and device behaviour were not exercised while adding this
  package; the project was generated on Linux and only the web build, sync and
  tests ran. Validate on real devices before shipping.
- The watch apps show assigned tasks, the running timer and the unread count
  and offer status and timer actions only. They have no complications or
  tiles, no notifications list and no offline cache, and their builds were not
  exercised either; see "Smart watches" above.
