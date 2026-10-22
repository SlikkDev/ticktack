import AppIntents
import Foundation

/// "Create a task in TickTack": Siri asks for a title, picks the project when
/// the user has more than one, and files the task in the project's first open
/// column, like the web app's create dialog does.
@available(iOS 16.0, *)
struct CreateTaskIntent: AppIntent {
    static var title: LocalizedStringResource = "Create Task"
    static var description = IntentDescription("Adds a task to one of your projects.")

    @Parameter(title: "Title", requestValueDialog: "What should the task be called?")
    var taskTitle: String

    @Parameter(title: "Project")
    var project: ProjectEntity?

    static var parameterSummary: some ParameterSummary {
        Summary("Create \(\.$taskTitle) in \(\.$project)")
    }

    func perform() async throws -> some IntentResult & ProvidesDialog {
        let title = taskTitle.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !title.isEmpty else {
            throw $taskTitle.needsValueError("What should the task be called?")
        }

        let client = try AssistantClient.signedIn()
        let target = try await resolveProject()
        let columns = try await client.columns(projectId: target.id)
        // The web app's create dialog skips final columns and slugs that
        // legacy data duplicated; a slug must name exactly one column.
        let slugCounts = Dictionary(columns.map { ($0.slug, 1) }, uniquingKeysWith: +)
        guard let column = columns.first(where: { !$0.isFinal && slugCounts[$0.slug] == 1 }) ?? columns.first else {
            throw AssistantError.projectHasNoColumns
        }

        _ = try await client.createTask(projectId: target.id, title: title, status: column.slug)
        return .result(dialog: "Added “\(title)” to \(target.name).")
    }

    private func resolveProject() async throws -> ProjectEntity {
        if let project {
            return project
        }
        let projects = try await ProjectQuery.allProjects()
        switch projects.count {
        case 0:
            throw AssistantError.noProjects
        case 1:
            return projects[0]
        default:
            guard let chosen = try await $project.requestDisambiguation(
                among: projects,
                dialog: "Which project?"
            ) else {
                throw AssistantError.noProjects
            }
            return chosen
        }
    }
}
