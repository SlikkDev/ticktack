import SwiftUI

/// The running timer: which task, for how long, and (from iOS 17) a button
/// that stops it without opening the app.
struct RunningTimerView: View {
    enum Style {
        /// Fills the small widget.
        case compact
        /// One row of the medium and large widgets.
        case row
    }

    let timer: WatchSummary.RunningTimer
    let style: Style

    var body: some View {
        switch style {
        case .compact:
            VStack(alignment: .leading, spacing: 4) {
                Label("widget.timer.running", systemImage: "timer")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                Text(timer.taskTitle)
                    .font(.headline)
                    .lineLimit(2)
                    .privacySensitive()
                Text(timer.projectName)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
                Spacer(minLength: 0)
                HStack {
                    Text(timer.startTime, style: .timer)
                        .font(.title2.monospacedDigit())
                        .minimumScaleFactor(0.6)
                        .lineLimit(1)
                        .frame(maxWidth: .infinity, alignment: .leading)
                    StopTimerButton()
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        case .row:
            HStack(spacing: 10) {
                Image(systemName: "timer")
                    .foregroundStyle(.tint)
                    .accessibilityHidden(true)
                VStack(alignment: .leading, spacing: 2) {
                    Text(timer.taskTitle)
                        .font(.subheadline.weight(.semibold))
                        .lineLimit(1)
                        .privacySensitive()
                    Text(timer.projectName)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                }
                Spacer(minLength: 8)
                Text(timer.startTime, style: .timer)
                    .font(.subheadline.monospacedDigit())
                    .multilineTextAlignment(.trailing)
                    .lineLimit(1)
                    .frame(minWidth: 56, alignment: .trailing)
                StopTimerButton()
            }
        }
    }
}
