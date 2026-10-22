import Capacitor
import Foundation

/// Native half of `apps/web/src/lib/native/watch-session.ts`.
///
/// `WatchBridge.setSession({ apiUrl, token })` relays the API base URL and
/// the bearer token to the paired Apple Watch; a null token signs it out.
@objc(WatchBridgePlugin)
public class WatchBridgePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "WatchBridgePlugin"
    public let jsName = "WatchBridge"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "setSession", returnType: CAPPluginReturnPromise)
    ]

    @objc func setSession(_ call: CAPPluginCall) {
        guard let apiUrl = call.getString("apiUrl"), !apiUrl.isEmpty else {
            call.reject("apiUrl is required")
            return
        }
        WatchSessionRelay.shared.update(apiUrl: apiUrl, token: call.getString("token"))
        call.resolve()
    }
}
