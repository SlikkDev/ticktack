import Foundation
import WidgetKit

/// One timeline entry: what the widget knew at `date`.
struct SummaryEntry: TimelineEntry {
    enum State {
        /// The phone app has not signed in yet, or the API rejected the token.
        case signedOut
        /// The API could not be reached; the provider retries sooner.
        case unavailable
        case loaded(WatchSummary)
    }

    let date: Date
    let state: State
    /// Where taps lead; nil until the web shell has handed over the session.
    var links: WidgetLinks? = nil

    var summary: WatchSummary? {
        if case .loaded(let summary) = state { return summary }
        return nil
    }

    /// Where a tap outside any row leads, and the only link the small and
    /// Lock Screen widgets can offer: the running timer's task, else My tasks.
    var primaryLink: URL? {
        guard let links else { return nil }
        if let timer = summary?.runningTimer {
            return links.task(of: timer)
        }
        return links.whatsNext
    }

    /// What the widget gallery shows, and what the first timeline redacts
    /// while it loads.
    static let sample: SummaryEntry = {
        let now = Date()
        let today = Calendar.current.startOfDay(for: now)
        let project = WatchSummary.Project(
            id: "website",
            name: "Website",
            slug: "WEB",
            workspaceId: "acme",
            workspaceName: "Acme",
            statuses: []
        )
        let tasks = [
            WatchSummary.TaskItem(
                id: "task-1",
                projectId: project.id,
                number: 12,
                title: "Fix the login bug",
                status: "in-progress",
                statusName: "In progress",
                priority: "high",
                dueDate: today
            ),
            WatchSummary.TaskItem(
                id: "task-2",
                projectId: project.id,
                number: 15,
                title: "Write the release notes",
                status: "to-do",
                statusName: "To do",
                priority: "medium",
                dueDate: today.addingTimeInterval(24 * 60 * 60)
            ),
            WatchSummary.TaskItem(
                id: "task-3",
                projectId: project.id,
                number: 18,
                title: "Plan the next sprint",
                status: "to-do",
                statusName: "To do",
                priority: "no-priority",
                dueDate: nil
            ),
        ]
        let summary = WatchSummary(
            user: WatchSummary.User(id: "me", name: "Me"),
            projects: [project],
            tasks: tasks,
            total: 7,
            runningTimer: WatchSummary.RunningTimer(
                id: "entry-1",
                taskId: "task-4",
                taskTitle: "Review the design",
                projectId: project.id,
                projectName: project.name,
                workspaceId: project.workspaceId,
                startTime: now.addingTimeInterval(-25 * 60)
            ),
            unreadNotifications: 2
        )
        return SummaryEntry(date: now, state: .loaded(summary))
    }()
}
