import Capacitor
import Foundation
import WidgetKit

/// Native half of `apps/web/src/lib/native/native-session.ts`.
///
/// `NativeSession.setSession({ apiUrl, clientUrl, token })` stores the URLs
/// and the bearer token for the Siri App Intents and the home screen widget
/// and relays them to the paired Apple Watch; a null token signs them all out.
@objc(NativeSessionPlugin)
public class NativeSessionPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "NativeSessionPlugin"
    public let jsName = "NativeSession"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "setSession", returnType: CAPPluginReturnPromise)
    ]

    @objc func setSession(_ call: CAPPluginCall) {
        guard let apiUrl = call.getString("apiUrl"), !apiUrl.isEmpty else {
            call.reject("apiUrl is required")
            return
        }
        NativeSessionStore.save(
            apiUrl: apiUrl,
            clientUrl: call.getString("clientUrl"),
            token: call.getString("token")
        )
        WatchSessionRelay.shared.publish()
        // The widget shows the signed-in user's tasks, or asks to sign in.
        WidgetCenter.shared.reloadAllTimelines()
        call.resolve()
    }
}
