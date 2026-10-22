import AppIntents
import Foundation

/// "Start a timer in TickTack": Siri asks which of the user's open tasks to
/// track and opens a time entry on it. Only one timer runs at a time, so a
/// timer on another task is stopped first.
@available(iOS 16.0, *)
struct StartTimerIntent: AppIntent {
    static var title: LocalizedStringResource = "Start Timer"
    static var description = IntentDescription("Starts tracking time on one of your tasks.")

    @Parameter(title: "Task", requestValueDialog: "Which task?")
    var task: TaskEntity

    static var parameterSummary: some ParameterSummary {
        Summary("Start a timer on \(\.$task)")
    }

    func perform() async throws -> some IntentResult & ProvidesDialog {
        let client = try AssistantClient.signedIn()
        let summary = try await client.summary()

        if let running = summary.runningTimer, running.taskId == task.id {
            return .result(dialog: "A timer is already running on “\(task.title)”.")
        }
        if let running = summary.runningTimer {
            try await client.stopTimer(running)
            try await client.startTimer(taskId: task.id)
            return .result(dialog: "Stopped the timer on “\(running.taskTitle)” and started one on “\(task.title)”.")
        }
        try await client.startTimer(taskId: task.id)
        return .result(dialog: "Timer started on “\(task.title)”.")
    }
}
