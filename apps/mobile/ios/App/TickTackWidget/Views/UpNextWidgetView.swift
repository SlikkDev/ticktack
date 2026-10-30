import SwiftUI
import WidgetKit

/// Picks the layout for the widget family. Every family carries the entry's
/// primary link, which the small and Lock Screen widgets rely on; rows in the
/// medium and large layouts link to their own pages.
struct UpNextWidgetView: View {
    @Environment(\.widgetFamily) private var family
    let entry: SummaryEntry

    var body: some View {
        content
            .widgetURL(entry.primaryLink)
    }

    @ViewBuilder
    private var content: some View {
        switch family {
        case .accessoryRectangular:
            AccessoryRectangularView(entry: entry)
                .accessoryContainerBackground()
        case .accessoryCircular:
            AccessoryCircularView(entry: entry)
                .accessoryContainerBackground()
        case .accessoryInline:
            AccessoryInlineView(entry: entry)
                .accessoryContainerBackground()
        case .systemSmall:
            SmallWidgetView(entry: entry)
                .widgetContainerBackground()
        case .systemLarge:
            ListWidgetView(entry: entry, rows: 8)
                .widgetContainerBackground()
        default:
            ListWidgetView(entry: entry, rows: 3)
                .widgetContainerBackground()
        }
    }
}
