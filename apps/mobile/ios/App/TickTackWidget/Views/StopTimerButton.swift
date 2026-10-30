import AppIntents
import SwiftUI
import WidgetKit

/// Stops the running timer in place with the same App Intent Siri uses; it
/// runs inside the widget extension. Widgets can run intents from iOS 17, so
/// on iOS 16 nothing is drawn and the row's link opens the task instead.
struct StopTimerButton: View {
    var body: some View {
        if #available(iOS 17.0, *) {
            Button(intent: StopTimerIntent()) {
                Image(systemName: "stop.fill")
                    .font(.caption.weight(.bold))
                    .frame(width: 28, height: 28)
            }
            .buttonStyle(.borderedProminent)
            .buttonBorderShape(.circle)
            .tint(.red)
            .accessibilityLabel("widget.timer.stop")
        }
    }
}
