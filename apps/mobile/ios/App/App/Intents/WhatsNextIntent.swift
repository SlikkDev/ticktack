import AppIntents
import Foundation
import SwiftUI

/// "What's next in TickTack": reads out the soonest-due open tasks assigned
/// to the user and shows them as a snippet.
@available(iOS 16.0, *)
struct WhatsNextIntent: AppIntent {
    static var title: LocalizedStringResource = "What's Next"
    static var description = IntentDescription("Tells you which of your tasks are due next.")

    private static let spokenTasks = 3

    func perform() async throws -> some IntentResult & ProvidesDialog & ShowsSnippetView {
        let summary = try await AssistantClient.signedIn().summary()
        let upNext = Array(summary.tasks.prefix(Self.spokenTasks))
        return .result(
            dialog: Self.dialog(for: upNext, in: summary),
            view: UpNextSnippetView(tasks: upNext, summary: summary)
        )
    }

    static func dialog(for tasks: [WatchSummary.TaskItem], in summary: WatchSummary, now: Date = Date()) -> IntentDialog {
        guard let first = tasks.first else {
            return "Nothing is assigned to you right now."
        }
        let project = summary.project(for: first)?.name ?? ""
        let due = first.dueDate.map { dueSuffix(for: $0, now: now) } ?? ""
        let rest = tasks.dropFirst().map(\.title)
        switch rest.count {
        case 0:
            return "Next up: “\(first.title)” in \(project)\(due)."
        case 1:
            return "Next up: “\(first.title)” in \(project)\(due). Then “\(rest[0])”."
        default:
            return "Next up: “\(first.title)” in \(project)\(due). Then “\(rest[0])” and “\(rest[1])”."
        }
    }

    /// ", due today", ", due tomorrow", ", overdue" or ", due Mar 4".
    static func dueSuffix(for date: Date, now: Date) -> String {
        let calendar = Calendar.current
        if calendar.isDateInToday(date) {
            return String(localized: ", due today")
        }
        if calendar.isDateInTomorrow(date) {
            return String(localized: ", due tomorrow")
        }
        if date < now {
            return String(localized: ", overdue")
        }
        return String(localized: ", due \(date.formatted(.dateTime.month(.abbreviated).day()))")
    }
}

@available(iOS 16.0, *)
struct UpNextSnippetView: View {
    let tasks: [WatchSummary.TaskItem]
    let summary: WatchSummary

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            if tasks.isEmpty {
                Text("Nothing is assigned to you right now.")
                    .foregroundStyle(.secondary)
            }
            ForEach(tasks) { task in
                HStack(alignment: .firstTextBaseline) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(task.title)
                            .font(.body)
                            .lineLimit(2)
                        Text(summary.project(for: task)?.name ?? "")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                    Spacer(minLength: 12)
                    if let dueDate = task.dueDate {
                        Text(dueDate, format: .dateTime.month(.abbreviated).day())
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
            }
            if summary.total > tasks.count {
                Text("\(summary.total - tasks.count) more in the app")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
        .padding()
    }
}
