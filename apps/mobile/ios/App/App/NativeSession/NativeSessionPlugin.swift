import Capacitor
import Foundation

/// Native half of `apps/web/src/lib/native/native-session.ts`.
///
/// `NativeSession.setSession({ apiUrl, token })` stores the API base URL and
/// the bearer token for the Siri App Intents and relays them to the paired
/// Apple Watch; a null token signs both out.
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
        NativeSessionStore.save(apiUrl: apiUrl, token: call.getString("token"))
        WatchSessionRelay.shared.publish()
        call.resolve()
    }
}
