import SwiftUI

/// One task: priority marker, title, project and due label.
struct TaskLineView: View {
    let task: WatchSummary.TaskItem
    let project: WatchSummary.Project?
    let showsProject: Bool

    private var isOverdue: Bool {
        TaskSection.section(for: task.dueDate) == .overdue
    }

    var body: some View {
        HStack(spacing: 8) {
            Circle()
                .fill(PriorityStyle.color(for: task.priority) ?? Color.secondary.opacity(0.3))
                .frame(width: 7, height: 7)
                .accessibilityHidden(true)
            VStack(alignment: .leading, spacing: 1) {
                Text(task.title)
                    .font(.subheadline)
                    .lineLimit(1)
                    .privacySensitive()
                if showsProject, let project {
                    Text(project.name)
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                }
            }
            Spacer(minLength: 6)
            if let dueDate = task.dueDate {
                Text(DueDateFormat.short(dueDate))
                    .font(.caption)
                    .foregroundStyle(isOverdue ? Color.red : Color.secondary)
                    .lineLimit(1)
            }
        }
        .accessibilityElement(children: .combine)
    }
}
