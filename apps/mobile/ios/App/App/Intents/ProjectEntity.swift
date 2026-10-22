import AppIntents

/// A project Siri can add a task to.
@available(iOS 16.0, *)
struct ProjectEntity: AppEntity {
    static var typeDisplayRepresentation = TypeDisplayRepresentation(name: "Project")
    static var defaultQuery = ProjectQuery()

    let id: String
    let name: String
    let workspaceName: String

    var displayRepresentation: DisplayRepresentation {
        DisplayRepresentation(title: "\(name)", subtitle: "\(workspaceName)")
    }
}

@available(iOS 16.0, *)
struct ProjectQuery: EntityStringQuery {
    func entities(for identifiers: [ProjectEntity.ID]) async throws -> [ProjectEntity] {
        try await Self.allProjects().filter { identifiers.contains($0.id) }
    }

    func entities(matching string: String) async throws -> [ProjectEntity] {
        let needle = AssistantMatching.normalize(string)
        guard !needle.isEmpty else { return [] }
        return try await Self.allProjects().filter {
            AssistantMatching.normalize($0.name).contains(needle)
        }
    }

    func suggestedEntities() async throws -> [ProjectEntity] {
        try await Self.allProjects()
    }

    /// Every active project in every workspace the user can read, in
    /// workspace order and then sidebar order.
    static func allProjects() async throws -> [ProjectEntity] {
        let client = try AssistantClient.signedIn()
        var projects: [ProjectEntity] = []
        for workspace in try await client.workspaces() {
            for project in try await client.projects(workspaceId: workspace.id) {
                projects.append(ProjectEntity(
                    id: project.id,
                    name: project.name,
                    workspaceName: workspace.name
                ))
            }
        }
        return projects
    }
}
