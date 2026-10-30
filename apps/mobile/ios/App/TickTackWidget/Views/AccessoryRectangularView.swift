import SwiftUI
import WidgetKit

/// Lock Screen rectangle: the running timer, otherwise the next task.
struct AccessoryRectangularView: View {
    let entry: SummaryEntry

    var body: some View {
        VStack(alignment: .leading, spacing: 1) {
            switch entry.state {
            case .signedOut:
                heading("TickTack", systemImage: "checklist")
                Text("widget.signedOut.short")
                    .font(.caption)
            case .unavailable:
                heading("TickTack", systemImage: "checklist")
                Text("widget.unavailable.short")
                    .font(.caption)
            case .loaded(let summary):
                if let timer = summary.runningTimer {
                    heading("widget.timer.running", systemImage: "timer")
                    Text(timer.taskTitle)
                        .font(.headline)
                        .lineLimit(1)
                        .privacySensitive()
                    Text(timer.startTime, style: .timer)
                        .font(.caption.monospacedDigit())
                        .lineLimit(1)
                } else if let next = summary.tasks.first {
                    heading("widget.title", systemImage: "checklist")
                    Text(next.title)
                        .font(.headline)
                        .lineLimit(2)
                        .privacySensitive()
                    if let dueDate = next.dueDate {
                        Text(DueDateFormat.short(dueDate))
                            .font(.caption2)
                    } else if let project = summary.project(for: next) {
                        Text(project.name)
                            .font(.caption2)
                    }
                } else {
                    heading("widget.title", systemImage: "checklist")
                    Text("widget.empty.title")
                        .font(.headline)
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private func heading(_ title: LocalizedStringKey, systemImage: String) -> some View {
        Label(title, systemImage: systemImage)
            .font(.caption2)
            .widgetAccentable()
    }
}
