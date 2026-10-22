import AppIntents
import Foundation

/// What Siri says when an intent cannot finish. The texts are keys in
/// App/Localizable.xcstrings.
@available(iOS 16.0, *)
enum AssistantError: Error, CustomLocalizedStringResourceConvertible {
    /// The web app has not signed in on this phone yet.
    case notSignedIn
    /// The token was rejected; the web app must sign in again.
    case unauthorized
    case noProjects
    case projectHasNoColumns
    case noRunningTimer
    case server(String)
    case unexpectedResponse

    var localizedStringResource: LocalizedStringResource {
        switch self {
        case .notSignedIn:
            return "Open TickTack and sign in first."
        case .unauthorized:
            return "Your TickTack session has expired. Open the app to sign in again."
        case .noProjects:
            return "You don't have a project to add tasks to yet."
        case .projectHasNoColumns:
            return "That project has no columns to add the task to."
        case .noRunningTimer:
            return "No timer is running."
        case .server(let message):
            return "TickTack couldn't do that: \(message)"
        case .unexpectedResponse:
            return "TickTack sent an unexpected response."
        }
    }
}
