import SwiftUI

/// Apple Watch companion for the TickTack iPhone app.
///
/// The phone hands over the API base URL and its bearer token (see
/// `App/Watch/WatchSessionRelay.swift`); from then on the watch talks
/// to the API directly, so it works whenever it has a network path, with or
/// without the phone app running.
@main
struct TickTackWatchApp: App {
    @StateObject private var sessionStore = WatchSessionStore()

    var body: some Scene {
        WindowGroup {
            ContentView(sessionStore: sessionStore)
                .environmentObject(sessionStore)
        }
    }
}
