import Combine
import Foundation
import WatchConnectivity

/// What the phone hands over: where the API lives and how to authenticate.
struct WatchCredentials: Equatable {
    let apiBaseURL: URL
    let token: String
}

/// Receives the session from the iPhone over WatchConnectivity and keeps it
/// across launches. The phone sends it as the application context on every
/// sign-in, token refresh and sign-out; the watch can also ask for it, which
/// wakes the phone app in the background.
@MainActor
final class WatchSessionStore: NSObject, ObservableObject {
    @Published private(set) var credentials: WatchCredentials?
    /// True while a request to the phone is in flight.
    @Published private(set) var isRequesting = false
    /// Why the last request to the phone failed, for the pairing screen.
    @Published private(set) var requestError: String?

    // Keys shared with App/Watch/WatchSessionRelay.swift.
    private static let apiUrlKey = "apiUrl"
    private static let tokenKey = "token"
    private static let requestKey = "request"
    private static let sessionRequest = "session"

    private static let apiUrlDefaultsKey = "io.slikk.ticktack.watch.api-url"
    private static let tokenAccount = "session-token"

    override init() {
        super.init()
        credentials = Self.restore()
        guard WCSession.isSupported() else { return }
        WCSession.default.delegate = self
        WCSession.default.activate()
    }

    /// Asks the phone for the current session. Uses the last application
    /// context first, which is available even while the phone is out of reach.
    func requestFromPhone() {
        guard WCSession.isSupported() else {
            requestError = String(localized: "pairing.unsupported")
            return
        }
        let wcSession = WCSession.default
        guard wcSession.activationState == .activated else {
            requestError = String(localized: "pairing.phoneUnreachable")
            return
        }
        if apply(context: wcSession.receivedApplicationContext), credentials != nil {
            return
        }
        guard wcSession.isReachable else {
            requestError = String(localized: "pairing.phoneUnreachable")
            return
        }

        isRequesting = true
        wcSession.sendMessage(
            [Self.requestKey: Self.sessionRequest],
            replyHandler: { [weak self] reply in
                Task { @MainActor in
                    guard let self else { return }
                    self.isRequesting = false
                    if !self.apply(context: reply) || self.credentials == nil {
                        self.requestError = String(localized: "pairing.notSignedIn")
                    }
                }
            },
            errorHandler: { [weak self] error in
                Task { @MainActor in
                    guard let self else { return }
                    self.isRequesting = false
                    self.requestError = error.localizedDescription
                }
            }
        )
    }

    /// The API rejected the token: the phone signed out or the session expired.
    func invalidate() {
        credentials = nil
        KeychainStore.write(nil, account: Self.tokenAccount)
    }

    /// Stores a session from the phone. Returns false when the context did
    /// not come from the TickTack app at all.
    @discardableResult
    private func apply(context: [String: Any]) -> Bool {
        guard let apiUrl = context[Self.apiUrlKey] as? String,
              let apiBaseURL = URL(string: apiUrl)
        else { return false }

        let token = (context[Self.tokenKey] as? String).flatMap { $0.isEmpty ? nil : $0 }
        UserDefaults.standard.set(apiUrl, forKey: Self.apiUrlDefaultsKey)
        KeychainStore.write(token, account: Self.tokenAccount)
        credentials = token.map { WatchCredentials(apiBaseURL: apiBaseURL, token: $0) }
        requestError = nil
        return true
    }

    private static func restore() -> WatchCredentials? {
        guard let apiUrl = UserDefaults.standard.string(forKey: apiUrlDefaultsKey),
              let apiBaseURL = URL(string: apiUrl),
              let token = KeychainStore.read(tokenAccount)
        else { return nil }
        return WatchCredentials(apiBaseURL: apiBaseURL, token: token)
    }
}

extension WatchSessionStore: WCSessionDelegate {
    nonisolated func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
        guard activationState == .activated else { return }
        let context = session.receivedApplicationContext
        Task { @MainActor in self.apply(context: context) }
    }

    nonisolated func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String: Any]) {
        Task { @MainActor in self.apply(context: applicationContext) }
    }
}
