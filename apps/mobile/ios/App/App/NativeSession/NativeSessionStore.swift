import Foundation
import Security

/// The session the web shell hands to native code: the API base URL, which
/// ends in `/api`, where the web app itself lives, and the Better Auth bearer
/// token.
struct NativeSession: Equatable {
    let apiBaseURL: URL
    /// Origin of the web app; links that open the app on a page start here
    /// (see TickTackWidget/WidgetLinks.swift).
    let clientURL: URL
    let token: String
}

/// Keeps the session for code that runs outside the WebView: the Siri App
/// Intents and the home screen widget call the API with it, and
/// WatchSessionRelay forwards it to the paired Apple Watch. The URLs are not
/// secret and live in the app group's UserDefaults; the token lives in the
/// keychain, in the app group's access group, so the widget extension can read
/// it and an intent can read it after a reboot without the app having been
/// opened.
enum NativeSessionStore {
    /// Shared by the app and the widget extension; both declare it in their
    /// entitlements. An app group doubles as a keychain access group and is
    /// used as-is, without the team identifier prefix.
    static let appGroup = "group.io.slikk.ticktack"

    private static let apiUrlKey = "io.slikk.ticktack.native-session.api-url"
    private static let clientUrlKey = "io.slikk.ticktack.native-session.client-url"
    private static let service = "io.slikk.ticktack.native-session"
    private static let tokenAccount = "token"

    private static var defaults: UserDefaults {
        UserDefaults(suiteName: appGroup) ?? .standard
    }

    static var apiUrl: String? {
        defaults.string(forKey: apiUrlKey)
    }

    static var token: String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: tokenAccount,
            kSecAttrAccessGroup as String: appGroup,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne,
        ]
        var item: CFTypeRef?
        guard SecItemCopyMatching(query as CFDictionary, &item) == errSecSuccess,
              let data = item as? Data
        else { return nil }
        return String(data: data, encoding: .utf8)
    }

    /// The signed-in session, or nil until the web app has signed in.
    static func current() -> NativeSession? {
        guard let apiUrl, let apiBaseURL = URL(string: apiUrl), let token else { return nil }
        // A build that does not know the client URL serves the web app from
        // the API origin, which is where the bundled deployment serves both.
        guard let clientURL = defaults.string(forKey: clientUrlKey).flatMap(URL.init(string:))
            ?? origin(of: apiBaseURL)
        else { return nil }
        return NativeSession(apiBaseURL: apiBaseURL, clientURL: clientURL, token: token)
    }

    /// Replaces the stored session. A nil or empty token signs native code
    /// out but keeps the URLs, so the watch can still be told to sign out.
    static func save(apiUrl: String, clientUrl: String?, token: String?) {
        defaults.set(apiUrl, forKey: apiUrlKey)
        if let clientUrl, !clientUrl.isEmpty {
            defaults.set(clientUrl, forKey: clientUrlKey)
        } else {
            defaults.removeObject(forKey: clientUrlKey)
        }

        let base: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: tokenAccount,
            kSecAttrAccessGroup as String: appGroup,
        ]
        SecItemDelete(base as CFDictionary)
        guard let token, !token.isEmpty, let data = token.data(using: .utf8) else { return }
        var attributes = base
        attributes[kSecValueData as String] = data
        // Siri may run an intent, and WidgetKit refresh a timeline, after a
        // reboot before the app is opened.
        attributes[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlock
        let status = SecItemAdd(attributes as CFDictionary, nil)
        if status != errSecSuccess {
            // Most likely the App Groups capability is missing from the
            // provisioning profile; see apps/mobile/README.md.
            NSLog("NativeSessionStore: could not store the token in the shared keychain (\(status))")
        }
    }

    private static func origin(of url: URL) -> URL? {
        var components = URLComponents()
        components.scheme = url.scheme
        components.host = url.host
        components.port = url.port
        return components.url
    }
}
