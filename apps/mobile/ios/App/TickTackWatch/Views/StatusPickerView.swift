import SwiftUI

struct StatusPickerView: View {
    let statuses: [WatchSummary.Status]
    let currentSlug: String
    let select: (WatchSummary.Status) -> Void

    var body: some View {
        NavigationStack {
            List(statuses) { status in
                Button {
                    select(status)
                } label: {
                    HStack {
                        Text(status.name)
                        Spacer()
                        if status.slug == currentSlug {
                            Image(systemName: "checkmark")
                                .foregroundStyle(.tint)
                        }
                    }
                }
                .disabled(status.slug == currentSlug)
            }
            .navigationTitle("task.changeStatus")
        }
    }
}
