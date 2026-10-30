import SwiftUI

/// Title and the day's due count, then the unread notification count (a link
/// to the inbox) and a new-task button (a link to the create dialog).
struct HeaderRow: View {
    let summary: WatchSummary
    let links: WidgetLinks?

    var body: some View {
        HStack(alignment: .firstTextBaseline, spacing: 8) {
            Text("widget.title")
                .font(.headline)
            let due = summary.dueNow().count
            if due > 0 {
                Text("widget.due \(due)")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            Spacer(minLength: 4)
            if summary.unreadNotifications > 0 {
                Linked(url: links?.inbox) {
                    Label("widget.unread \(summary.unreadNotifications)", systemImage: "bell.badge")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
            Linked(url: links?.createTask) {
                Image(systemName: "plus.circle.fill")
                    .font(.title3)
                    .foregroundStyle(.tint)
                    .accessibilityLabel("widget.newTask")
            }
        }
    }
}
