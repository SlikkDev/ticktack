import SwiftUI

/// The small Home Screen widget: the running timer when there is one,
/// otherwise the next two tasks. The whole widget is one link.
struct SmallWidgetView: View {
    let entry: SummaryEntry

    var body: some View {
        switch entry.state {
        case .signedOut:
            MessageView(systemImage: "person.crop.circle.badge.exclamationmark", text: "widget.signedOut")
        case .unavailable:
            MessageView(systemImage: "wifi.exclamationmark", text: "widget.unavailable")
        case .loaded(let summary):
            if let timer = summary.runningTimer {
                RunningTimerView(timer: timer, style: .compact)
            } else {
                tasks(summary)
            }
        }
    }

    private func tasks(_ summary: WatchSummary) -> some View {
        let due = summary.dueNow().count
        return VStack(alignment: .leading, spacing: 6) {
            Text("widget.title")
                .font(.headline)
            if due > 0 {
                Text("widget.due \(due)")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            Spacer(minLength: 0)
            if summary.tasks.isEmpty {
                Label("widget.empty.title", systemImage: "checkmark.circle")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                Spacer(minLength: 0)
            } else {
                ForEach(summary.tasks.prefix(2)) { task in
                    TaskLineView(task: task, project: summary.project(for: task), showsProject: false)
                }
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }
}
