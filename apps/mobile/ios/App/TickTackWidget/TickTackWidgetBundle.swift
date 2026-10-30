import SwiftUI
import WidgetKit

/// Home Screen and Lock Screen widgets for the TickTack iPhone app.
///
/// The extension runs in its own process. It reads the session the web shell
/// stored through the NativeSession plugin (App/NativeSession) from the shared
/// app group and calls `GET /api/watch/summary` itself, like the Siri intents
/// and the watch do; taps open the app through the web app's own links.
@main
struct TickTackWidgetBundle: WidgetBundle {
    var body: some Widget {
        UpNextWidget()
    }
}
