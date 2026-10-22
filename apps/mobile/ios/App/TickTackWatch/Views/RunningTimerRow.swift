import SwiftUI

struct RunningTimerRow: View {
    let timer: WatchSummary.RunningTimer
    let isBusy: Bool
    let stop: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Label("timer.running", systemImage: "timer")
                .font(.caption2)
                .foregroundStyle(.secondary)
            Text(timer.taskTitle)
                .font(.headline)
                .lineLimit(2)
            HStack {
                Text(timer.startTime, style: .timer)
                    .font(.title3.monospacedDigit())
                Spacer()
                Button(role: .destructive, action: stop) {
                    Label("timer.stop", systemImage: "stop.fill")
                        .labelStyle(.iconOnly)
                }
                .buttonStyle(.borderedProminent)
                .tint(.red)
                .disabled(isBusy)
            }
        }
    }
}
