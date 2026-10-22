import Foundation
import WatchConnectivity

/// Keeps the paired Apple Watch signed in.
///
/// The web app pushes the API base URL and the bearer token through the
/// `NativeSession` plugin on every launch and token change; NativeSessionStore
/// keeps them and this relay forwards them as the WatchConnectivity
/// application context, which the watch receives even if it was unreachable
/// at the time. The watch can also ask for the session with a message; that
/// launches this app in the background when needed, so the answer comes from
/// the stored copy.
final class WatchSessionRelay: NSObject, WCSessionDelegate {
    static let shared = WatchSessionRelay()

    // Keys shared with TickTackWatch/Session/WatchSessionStore.swift.
    static let apiUrlKey = "apiUrl"
    static let tokenKey = "token"
    static let updatedAtKey = "updatedAt"
    static let requestKey = "request"
    static let sessionRequest = "session"

    private override init() {
        super.init()
    }

    /// Activates WatchConnectivity. Call once at launch, before the watch can
    /// message the phone; an inactive session drops incoming messages.
    func activate() {
        guard WCSession.isSupported() else { return }
        let session = WCSession.default
        session.delegate = self
        session.activate()
    }

    /// The stored session as the watch expects it: the API URL, plus the
    /// token while signed in. Empty before the first sign-in.
    private var storedSession: [String: Any] {
        guard let apiUrl = NativeSessionStore.apiUrl else { return [:] }
        var session: [String: Any] = [Self.apiUrlKey: apiUrl]
        if let token = NativeSessionStore.token {
            session[Self.tokenKey] = token
        }
        return session
    }

    /// Sends the stored session to the watch. Call after every change; a
    /// session without a token signs the watch out.
    func publish() {
        guard WCSession.isSupported() else { return }
        let session = WCSession.default
        guard session.activationState == .activated,
              session.isPaired,
              session.isWatchAppInstalled,
              !storedSession.isEmpty
        else { return }

        // The system skips an application context identical to the previous
        // one, so a sign-out followed by a sign-in with the same token would
        // otherwise never reach the watch.
        var context = storedSession
        context[Self.updatedAtKey] = Date().timeIntervalSince1970
        do {
            try session.updateApplicationContext(context)
        } catch {
            NSLog("WatchSessionRelay: could not update the application context: \(error.localizedDescription)")
        }
    }

    // MARK: - WCSessionDelegate

    func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
        if let error {
            NSLog("WatchSessionRelay: activation failed: \(error.localizedDescription)")
            return
        }
        if activationState == .activated {
            publish()
        }
    }

    func sessionDidBecomeInactive(_ session: WCSession) {}

    func sessionDidDeactivate(_ session: WCSession) {
        // The user switched to another watch; reconnect to it.
        session.activate()
    }

    func sessionWatchStateDidChange(_ session: WCSession) {
        // A newly installed watch app needs the current session right away.
        publish()
    }

    func session(_ session: WCSession, didReceiveMessage message: [String: Any], replyHandler: @escaping ([String: Any]) -> Void) {
        guard message[Self.requestKey] as? String == Self.sessionRequest else {
            replyHandler([:])
            return
        }
        replyHandler(storedSession)
    }
}
