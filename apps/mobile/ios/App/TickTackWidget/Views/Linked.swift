import SwiftUI

/// Wraps content in a link when the destination is known. Only the medium
/// and large families support links; the others use `widgetURL`.
struct Linked<Content: View>: View {
    let url: URL?
    @ViewBuilder let content: () -> Content

    var body: some View {
        if let url {
            Link(destination: url) { content() }
        } else {
            content()
        }
    }
}
