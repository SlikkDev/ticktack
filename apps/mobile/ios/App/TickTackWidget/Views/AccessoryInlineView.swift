import SwiftUI

/// Lock Screen inline text: the running timer, otherwise the next task.
struct AccessoryInlineView: View {
    let entry: SummaryEntry

    var body: some View {
        switch entry.state {
        case .signedOut, .unavailable:
            Label("TickTack", systemImage: "checklist")
        case .loaded(let summary):
            if let timer = summary.runningTimer {
                Label {
                    Text(timer.startTime, style: .timer) + Text(verbatim: " · ") + Text(timer.taskTitle)
                } icon: {
                    Image(systemName: "timer")
                }
                .privacySensitive()
            } else if let next = summary.tasks.first {
                Label {
                    Text("widget.next") + Text(verbatim: ": ") + Text(next.title)
                } icon: {
                    Image(systemName: "checklist")
                }
                .privacySensitive()
            } else {
                Label("widget.nothingDue", systemImage: "checkmark.circle")
            }
        }
    }
}
