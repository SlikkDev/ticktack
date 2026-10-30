import SwiftUI
import WidgetKit

extension View {
    /// iOS 17 draws widgets on a system-managed container background, which
    /// it also removes on the Lock Screen and in StandBy, and adds the
    /// content margins itself; earlier versions need the view to pad and
    /// paint itself.
    @ViewBuilder
    func widgetContainerBackground() -> some View {
        if #available(iOS 17.0, *) {
            containerBackground(for: .widget) { Color("WidgetBackground") }
        } else {
            padding()
                .background(Color("WidgetBackground"))
        }
    }

    /// Lock Screen widgets have no background of their own; declaring an
    /// empty one keeps iOS 17 from treating the widget as a legacy one.
    @ViewBuilder
    func accessoryContainerBackground() -> some View {
        if #available(iOS 17.0, *) {
            containerBackground(for: .widget) { Color.clear }
        } else {
            self
        }
    }
}
