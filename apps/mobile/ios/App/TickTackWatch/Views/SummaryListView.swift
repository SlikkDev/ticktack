import SwiftUI

struct SummaryListView: View {
    @ObservedObject var model: SummaryModel

    private var groups: [TaskGroup] {
        TaskSections.group(model.summary.tasks)
    }

    var body: some View {
        List {
            if let timer = model.summary.runningTimer {
                Section {
                    RunningTimerRow(timer: timer, isBusy: model.busyTaskIds.contains(timer.taskId)) {
                        Task { await model.stopTimer() }
                    }
                }
            }

            if model.summary.unreadNotifications > 0 {
                Section {
                    Label(
                        String(localized: "notifications.unread \(model.summary.unreadNotifications)"),
                        systemImage: "bell.badge"
                    )
                    .font(.footnote)
                }
            }

            if let message = model.errorMessage {
                Section {
                    Text(message)
                        .font(.footnote)
                        .foregroundStyle(.red)
                }
            }

            if model.hasLoaded && model.summary.tasks.isEmpty {
                ContentUnavailableView(
                    "tasks.emptyTitle",
                    systemImage: "checkmark.circle",
                    description: Text("tasks.emptyBody")
                )
            }

            ForEach(groups) { group in
                Section(group.section.title) {
                    ForEach(group.tasks) { task in
                        NavigationLink(value: task) {
                            TaskRow(task: task, project: model.summary.project(for: task))
                        }
                    }
                }
            }

            if model.summary.total > model.summary.tasks.count {
                Section {
                    Text("tasks.more \(model.summary.total - model.summary.tasks.count)")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }
            }
        }
        .navigationTitle("TickTack")
        .navigationDestination(for: WatchSummary.TaskItem.self) { task in
            TaskDetailView(taskId: task.id, fallback: task, model: model)
        }
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button {
                    Task { await model.refresh() }
                } label: {
                    Label("tasks.refresh", systemImage: "arrow.clockwise")
                }
                .disabled(model.isLoading)
            }
        }
        .overlay {
            if model.isLoading && !model.hasLoaded {
                ProgressView()
            }
        }
        .task { await model.refresh() }
        .refreshable { await model.refresh() }
    }
}
