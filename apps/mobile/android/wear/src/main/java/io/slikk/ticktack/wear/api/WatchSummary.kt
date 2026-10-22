package io.slikk.ticktack.wear.api

import java.time.Instant
import org.json.JSONArray
import org.json.JSONObject

/** Mirrors `WatchSummary` in apps/api/src/watch/response.ts. */
data class WatchSummary(
    val user: User,
    val projects: List<Project>,
    val tasks: List<TaskItem>,
    val total: Int,
    val runningTimer: RunningTimer?,
    val unreadNotifications: Int,
) {
    data class User(val id: String, val name: String)

    data class Status(val slug: String, val name: String, val isFinal: Boolean)

    data class Project(
        val id: String,
        val name: String,
        val slug: String,
        val workspaceId: String,
        val workspaceName: String,
        val statuses: List<Status>,
    ) {
        val finalStatus: Status? get() = statuses.firstOrNull { it.isFinal }
    }

    data class TaskItem(
        val id: String,
        val projectId: String,
        val number: Int?,
        val title: String,
        val status: String,
        val statusName: String?,
        val priority: String,
        val dueDate: Instant?,
    )

    data class RunningTimer(
        val id: String,
        val taskId: String,
        val taskTitle: String,
        val projectName: String,
        val startTime: Instant,
    )

    fun project(task: TaskItem): Project? = projects.firstOrNull { it.id == task.projectId }

    fun task(id: String): TaskItem? = tasks.firstOrNull { it.id == id }

    companion object {
        val EMPTY = WatchSummary(User("", ""), emptyList(), emptyList(), 0, null, 0)

        fun parse(json: JSONObject): WatchSummary {
            val user = json.getJSONObject("user")
            return WatchSummary(
                user = User(user.getString("id"), user.getString("name")),
                projects = json.getJSONArray("projects").map { project ->
                    Project(
                        id = project.getString("id"),
                        name = project.getString("name"),
                        slug = project.getString("slug"),
                        workspaceId = project.getString("workspaceId"),
                        workspaceName = project.getString("workspaceName"),
                        statuses = project.getJSONArray("statuses").map { status ->
                            Status(status.getString("slug"), status.getString("name"), status.getBoolean("isFinal"))
                        },
                    )
                },
                tasks = json.getJSONArray("tasks").map { task ->
                    TaskItem(
                        id = task.getString("id"),
                        projectId = task.getString("projectId"),
                        number = if (task.isNull("number")) null else task.getInt("number"),
                        title = task.getString("title"),
                        status = task.getString("status"),
                        statusName = task.optStringOrNull("statusName"),
                        priority = task.getString("priority"),
                        dueDate = task.optStringOrNull("dueDate")?.let(Instant::parse),
                    )
                },
                total = json.getInt("total"),
                runningTimer = json.optJSONObject("runningTimer")?.let { timer ->
                    RunningTimer(
                        id = timer.getString("id"),
                        taskId = timer.getString("taskId"),
                        taskTitle = timer.getString("taskTitle"),
                        projectName = timer.getString("projectName"),
                        startTime = Instant.parse(timer.getString("startTime")),
                    )
                },
                unreadNotifications = json.getInt("unreadNotifications"),
            )
        }

        private fun <T> JSONArray.map(transform: (JSONObject) -> T): List<T> =
            List(length()) { index -> transform(getJSONObject(index)) }

        private fun JSONObject.optStringOrNull(key: String): String? =
            if (isNull(key)) null else getString(key)
    }
}
