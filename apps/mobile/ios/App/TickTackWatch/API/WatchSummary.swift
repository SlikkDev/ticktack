import Foundation

/// Mirrors `WatchSummary` in apps/api/src/watch/response.ts.
struct WatchSummary: Decodable, Equatable {
    struct User: Decodable, Equatable {
        let id: String
        let name: String
    }

    struct Status: Decodable, Hashable, Identifiable {
        let slug: String
        let name: String
        let isFinal: Bool

        var id: String { slug }
    }

    struct Project: Decodable, Hashable, Identifiable {
        let id: String
        let name: String
        let slug: String
        let workspaceId: String
        let workspaceName: String
        let statuses: [Status]

        var finalStatus: Status? { statuses.first { $0.isFinal } }
    }

    struct TaskItem: Decodable, Hashable, Identifiable {
        let id: String
        let projectId: String
        let number: Int?
        let title: String
        let status: String
        let statusName: String?
        let priority: String
        let dueDate: Date?
    }

    struct RunningTimer: Decodable, Hashable {
        let id: String
        let taskId: String
        let taskTitle: String
        let projectId: String
        let projectName: String
        let workspaceId: String
        let startTime: Date
    }

    let user: User
    let projects: [Project]
    let tasks: [TaskItem]
    let total: Int
    let runningTimer: RunningTimer?
    let unreadNotifications: Int

    static let empty = WatchSummary(
        user: User(id: "", name: ""),
        projects: [],
        tasks: [],
        total: 0,
        runningTimer: nil,
        unreadNotifications: 0
    )

    func project(for task: TaskItem) -> Project? {
        projects.first { $0.id == task.projectId }
    }

    func task(withId id: String) -> TaskItem? {
        tasks.first { $0.id == id }
    }
}
