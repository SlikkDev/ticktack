import SwiftUI

/// Medium and large Home Screen widgets: a header with the unread count and
/// a new-task button, the running timer, then as many tasks as fit. Each row
/// links to its own page.
struct ListWidgetView: View {
    let entry: SummaryEntry
    /// Rows available for the timer and the tasks together.
    let rows: Int

    var body: some View {
        switch entry.state {
        case .signedOut:
            MessageView(systemImage: "person.crop.circle.badge.exclamationmark", text: "widget.signedOut")
        case .unavailable:
            MessageView(systemImage: "wifi.exclamationmark", text: "widget.unavailable")
        case .loaded(let summary):
            loaded(summary)
        }
    }

    private func loaded(_ summary: WatchSummary) -> some View {
        let links = entry.links
        let timer = summary.runningTimer
        let visible = Array(summary.tasks.prefix(max(rows - (timer == nil ? 0 : 1), 1)))
        let hidden = summary.total - visible.count
        return VStack(alignment: .leading, spacing: 8) {
            HeaderRow(summary: summary, links: links)
            if let timer {
                Linked(url: links?.task(of: timer)) {
                    RunningTimerView(timer: timer, style: .row)
                }
            }
            if summary.tasks.isEmpty {
                Spacer(minLength: 0)
                HStack {
                    Spacer()
                    Label("widget.empty.body", systemImage: "checkmark.circle")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                    Spacer()
                }
                Spacer(minLength: 0)
            } else {
                ForEach(visible) { task in
                    Linked(url: links?.task(task, in: summary)) {
                        TaskLineView(task: task, project: summary.project(for: task), showsProject: true)
                    }
                }
                Spacer(minLength: 0)
                if hidden > 0 {
                    Text("widget.more \(hidden)")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }
}
