import SwiftUI

struct ContentView: View {
    @EnvironmentObject private var sessionStore: WatchSessionStore
    @StateObject private var model: SummaryModel

    init(sessionStore: WatchSessionStore) {
        _model = StateObject(wrappedValue: SummaryModel(sessionStore: sessionStore))
    }

    var body: some View {
        if sessionStore.credentials == nil {
            PairingView()
        } else {
            NavigationStack {
                SummaryListView(model: model)
            }
        }
    }
}
