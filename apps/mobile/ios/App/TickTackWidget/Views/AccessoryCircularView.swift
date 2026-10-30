import SwiftUI
import WidgetKit

/// Lock Screen circle: the running timer, otherwise how many tasks are due
/// today or overdue.
struct AccessoryCircularView: View {
    let entry: SummaryEntry

    var body: some View {
        ZStack {
            AccessoryWidgetBackground()
            switch entry.state {
            case .loaded(let summary):
                if let timer = summary.runningTimer {
                    VStack(spacing: 0) {
                        Image(systemName: "timer")
                            .font(.caption2)
                            .widgetAccentable()
                        Text(timer.startTime, style: .timer)
                            .font(.caption2.monospacedDigit())
                            .multilineTextAlignment(.center)
                            .minimumScaleFactor(0.5)
                            .lineLimit(1)
                    }
                    .padding(4)
                } else {
                    VStack(spacing: -2) {
                        Text(summary.dueNow().count, format: .number)
                            .font(.title2.weight(.semibold))
                            .widgetAccentable()
                        Text("widget.dueLabel")
                            .font(.caption2)
                    }
                }
            default:
                Image(systemName: "checklist")
                    .font(.title3)
                    .widgetAccentable()
            }
        }
    }
}
