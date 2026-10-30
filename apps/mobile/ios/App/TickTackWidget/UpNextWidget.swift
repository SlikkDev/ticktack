import SwiftUI
import WidgetKit

/// "Up next": the running timer and the soonest-due open tasks assigned to
/// the user, on the Home Screen (small, medium, large) and the Lock Screen
/// (rectangular, circular, inline). A tap opens the app on the task, on My
/// tasks or on the create-task dialog.
struct UpNextWidget: Widget {
    static let kind = "io.slikk.ticktack.up-next"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: Self.kind, provider: SummaryProvider()) { entry in
            UpNextWidgetView(entry: entry)
        }
        .configurationDisplayName("widget.title")
        .description("widget.description")
        .supportedFamilies([
            .systemSmall,
            .systemMedium,
            .systemLarge,
            .accessoryRectangular,
            .accessoryCircular,
            .accessoryInline,
        ])
    }
}
