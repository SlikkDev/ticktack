import AppIntents
import Foundation

/// "Stop the timer in TickTack": closes the running time entry and says how
/// long it ran.
@available(iOS 16.0, *)
struct StopTimerIntent: AppIntent {
    static var title: LocalizedStringResource = "Stop Timer"
    static var description = IntentDescription("Stops the running timer.")

    func perform() async throws -> some IntentResult & ProvidesDialog {
        let client = try AssistantClient.signedIn()
        guard let running = try await client.summary().runningTimer else {
            throw AssistantError.noRunningTimer
        }
        try await client.stopTimer(running)
        let duration = Self.spokenDuration(from: running.startTime, to: Date())
        return .result(dialog: "Stopped the timer on “\(running.taskTitle)” after \(duration).")
    }

    /// "1 hour, 12 minutes" in the user's language; under a minute becomes
    /// "less than a minute".
    static func spokenDuration(from start: Date, to end: Date) -> String {
        let seconds = max(0, end.timeIntervalSince(start))
        guard seconds >= 60 else {
            return String(localized: "less than a minute")
        }
        let formatter = DateComponentsFormatter()
        formatter.allowedUnits = seconds >= 3600 ? [.hour, .minute] : [.minute]
        formatter.unitsStyle = .full
        return formatter.string(from: seconds) ?? String(localized: "less than a minute")
    }
}
