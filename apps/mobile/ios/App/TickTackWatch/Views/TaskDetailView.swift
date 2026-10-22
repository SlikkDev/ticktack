import SwiftUI

struct TaskDetailView: View {
    let taskId: String
    /// The row that was tapped, shown until the next refresh replaces it.
    let fallback: WatchSummary.TaskItem
    @ObservedObject var model: SummaryModel
    @Environment(\.dismiss) private var dismiss
    @State private var showingStatuses = false

    private var task: WatchSummary.TaskItem {
        model.summary.task(withId: taskId) ?? fallback
    }

    private var project: WatchSummary.Project? {
        model.summary.project(for: task)
    }

    private var isTimerRunningHere: Bool {
        model.summary.runningTimer?.taskId == task.id
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 8) {
                Text(task.title)
                    .font(.headline)
                if let project {
                    Text(verbatim: "\(project.name) · \(project.workspaceName)")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }
                if let statusName = task.statusName {
                    LabeledContent("task.status", value: statusName)
                        .font(.footnote)
                }
                if let dueDate = task.dueDate {
                    LabeledContent("task.due", value: DueDateFormat.long(dueDate))
                        .font(.footnote)
                }

                Divider()

                if let done = project?.finalStatus, done.slug != task.status {
                    Button {
                        Task {
                            if await model.setStatus(done, for: task) { dismiss() }
                        }
                    } label: {
                        Label("task.complete", systemImage: "checkmark.circle.fill")
                    }
                    .tint(.green)
                }

                if let statuses = project?.statuses, statuses.count > 1 {
                    Button {
                        showingStatuses = true
                    } label: {
                        Label("task.changeStatus", systemImage: "arrow.right.circle")
                    }
                }

                if isTimerRunningHere {
                    Button(role: .destructive) {
                        Task { await model.stopTimer() }
                    } label: {
                        Label("timer.stop", systemImage: "stop.circle")
                    }
                } else {
                    Button {
                        Task { await model.startTimer(for: task) }
                    } label: {
                        Label("timer.start", systemImage: "play.circle")
                    }
                }

                if let message = model.errorMessage {
                    Text(message)
                        .font(.footnote)
                        .foregroundStyle(.red)
                }
            }
        }
        .disabled(model.isBusy(task))
        .navigationTitle(task.number.map { "#\($0)" } ?? "")
        .sheet(isPresented: $showingStatuses) {
            StatusPickerView(statuses: project?.statuses ?? [], currentSlug: task.status) { status in
                showingStatuses = false
                Task {
                    if await model.setStatus(status, for: task), status.isFinal { dismiss() }
                }
            }
        }
    }
}
