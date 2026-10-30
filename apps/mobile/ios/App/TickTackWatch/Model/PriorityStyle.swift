import SwiftUI

/// Priority markers shared by the watch rows and the widget lines.
enum PriorityStyle {
    /// Only priorities that need attention get a marker; the rest stay quiet.
    static func color(for priority: String) -> Color? {
        switch priority {
        case "urgent": return .red
        case "high": return .orange
        case "medium": return .yellow
        default: return nil
        }
    }
}
