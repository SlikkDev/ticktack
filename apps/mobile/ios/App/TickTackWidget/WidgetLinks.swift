import Foundation

/// Links that open the app on a page. They are the web app's own URLs, which
/// the shell routes in-app (apps/web/src/lib/native/shell.ts,
/// `listenForAppLinks`), so the widget needs no native routes of its own.
struct WidgetLinks {
    /// Origin of the web app, from the NativeSession hand-off.
    let clientURL: URL

    /// My tasks, through the assistant route that first resolves the active
    /// workspace (apps/web/src/lib/assistant).
    var whatsNext: URL {
        page("/dashboard/assistant/whats-next")
    }

    /// The create-task dialog.
    var createTask: URL {
        page("/dashboard/assistant/create-task")
    }

    var inbox: URL {
        page("/dashboard/assistant/open", query: [URLQueryItem(name: "feature", value: "inbox")])
    }

    func task(_ task: WatchSummary.TaskItem, in summary: WatchSummary) -> URL {
        guard let project = summary.project(for: task) else { return whatsNext }
        return taskPage(workspaceId: project.workspaceId, projectId: project.id, taskId: task.id)
    }

    func task(of timer: WatchSummary.RunningTimer) -> URL {
        taskPage(workspaceId: timer.workspaceId, projectId: timer.projectId, taskId: timer.taskId)
    }

    private func taskPage(workspaceId: String, projectId: String, taskId: String) -> URL {
        page("/dashboard/workspace/\(workspaceId)/project/\(projectId)/task/\(taskId)")
    }

    private func page(_ path: String, query: [URLQueryItem] = []) -> URL {
        guard var components = URLComponents(url: clientURL, resolvingAgainstBaseURL: false) else {
            return clientURL
        }
        components.path = path
        components.queryItems = query.isEmpty ? nil : query
        components.fragment = nil
        return components.url ?? clientURL
    }
}
