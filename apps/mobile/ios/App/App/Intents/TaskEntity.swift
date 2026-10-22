import AppIntents

/// One of the user's open assigned tasks, as Siri offers them for a timer.
@available(iOS 16.0, *)
struct TaskEntity: AppEntity {
    static var typeDisplayRepresentation = TypeDisplayRepresentation(name: "Task")
    static var defaultQuery = TaskQuery()

    let id: String
    let title: String
    let projectName: String

    init(_ task: WatchSummary.TaskItem, in summary: WatchSummary) {
        id = task.id
        title = task.title
        projectName = summary.project(for: task)?.name ?? ""
    }

    var displayRepresentation: DisplayRepresentation {
        DisplayRepresentation(title: "\(title)", subtitle: "\(projectName)")
    }
}

@available(iOS 16.0, *)
struct TaskQuery: EntityStringQuery {
    // Siri asks for the most relevant few; the summary is already sorted by
    // due date, then priority.
    private static let suggestionLimit = 8

    func entities(for identifiers: [TaskEntity.ID]) async throws -> [TaskEntity] {
        let summary = try await AssistantClient.signedIn().summary()
        return summary.tasks
            .filter { identifiers.contains($0.id) }
            .map { TaskEntity($0, in: summary) }
    }

    func entities(matching string: String) async throws -> [TaskEntity] {
        let summary = try await AssistantClient.signedIn().summary()
        return AssistantMatching
            .rank(summary.tasks, query: string, projects: summary.projects)
            .map { TaskEntity($0, in: summary) }
    }

    func suggestedEntities() async throws -> [TaskEntity] {
        let summary = try await AssistantClient.signedIn().summary()
        return summary.tasks.prefix(Self.suggestionLimit).map { TaskEntity($0, in: summary) }
    }
}
