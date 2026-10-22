import Foundation
import Security

/// The session the web shell hands to native code: the API base URL, which
/// ends in `/api`, and the Better Auth bearer token.
struct NativeSession: Equatable {
    let apiBaseURL: URL
    let token: String
}

/// Keeps the session for code that runs outside the WebView: the Siri App
/// Intents call the API with it, and WatchSessionRelay forwards it to the
/// paired Apple Watch. The URL is not secret and lives in UserDefaults; the
/// token lives in the keychain so an intent can read it after a reboot
/// without the app having been opened.
enum NativeSessionStore {
    private static let apiUrlKey = "io.slikk.ticktack.native-session.api-url"
    private static let service = "io.slikk.ticktack.native-session"
    private static let tokenAccount = "token"

    static var apiUrl: String? {
        UserDefaults.standard.string(forKey: apiUrlKey)
    }

    static var token: String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: tokenAccount,
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
        guard let apiUrl, let url = URL(string: apiUrl), let token else { return nil }
        return NativeSession(apiBaseURL: url, token: token)
    }

    /// Replaces the stored session. A nil or empty token signs native code
    /// out but keeps the URL, so the watch can still be told to sign out.
    static func save(apiUrl: String, token: String?) {
        UserDefaults.standard.set(apiUrl, forKey: apiUrlKey)

        let base: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: tokenAccount,
        ]
        SecItemDelete(base as CFDictionary)
        guard let token, !token.isEmpty, let data = token.data(using: .utf8) else { return }
        var attributes = base
        attributes[kSecValueData as String] = data
        // Siri may run an intent after a reboot before the app is opened.
        attributes[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlock
        SecItemAdd(attributes as CFDictionary, nil)
    }
}
