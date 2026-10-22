import SwiftUI

struct TaskRow: View {
    let task: WatchSummary.TaskItem
    let project: WatchSummary.Project?

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            HStack(alignment: .firstTextBaseline, spacing: 4) {
                if let color = PriorityStyle.color(for: task.priority) {
                    Circle()
                        .fill(color)
                        .frame(width: 6, height: 6)
                        .accessibilityHidden(true)
                }
                Text(task.title)
                    .font(.headline)
                    .lineLimit(2)
            }
            HStack(spacing: 4) {
                if let project {
                    Text(project.name)
                }
                if let dueDate = task.dueDate {
                    if project != nil {
                        Text(verbatim: "·")
                    }
                    Text(DueDateFormat.short(dueDate))
                }
            }
            .font(.caption2)
            .foregroundStyle(.secondary)
            .lineLimit(1)
        }
        .accessibilityElement(children: .combine)
    }
}

enum PriorityStyle {
    /// Only priorities that need attention get a marker; the rest stay quiet.
    static func color(for priority: String) -> Color? {
        switch priority {
        case "urgent": return .red
        case "high": return .orange
        case "medium": return .yellow
        default: return nil
        }
    }
}
