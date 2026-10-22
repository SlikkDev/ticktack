import SwiftUI

/// Shown until the iPhone has handed over a signed-in session.
struct PairingView: View {
    @EnvironmentObject private var sessionStore: WatchSessionStore

    var body: some View {
        ScrollView {
            VStack(spacing: 12) {
                Image(systemName: "iphone")
                    .font(.largeTitle)
                    .foregroundStyle(.tint)
                    .accessibilityHidden(true)
                Text("pairing.title")
                    .font(.headline)
                Text("pairing.body")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
                if let error = sessionStore.requestError {
                    Text(error)
                        .font(.footnote)
                        .foregroundStyle(.red)
                        .multilineTextAlignment(.center)
                }
                Button {
                    sessionStore.requestFromPhone()
                } label: {
                    if sessionStore.isRequesting {
                        ProgressView()
                    } else {
                        Text("pairing.retry")
                    }
                }
                .disabled(sessionStore.isRequesting)
            }
            .padding(.horizontal)
        }
        .navigationTitle("TickTack")
        .onAppear { sessionStore.requestFromPhone() }
    }
}
