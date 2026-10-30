package io.slikk.ticktack.widget;

import java.text.ParseException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

/**
 * The parts of {@code WatchSummary} (apps/api/src/watch/response.ts) that the
 * widget renders. The Wear OS app keeps its own Kotlin mirror in
 * apps/mobile/android/wear.
 */
final class WidgetSummary {

    static final class Project {
        final String id;
        final String name;
        final String workspaceId;

        Project(String id, String name, String workspaceId) {
            this.id = id;
            this.name = name;
            this.workspaceId = workspaceId;
        }
    }

    static final class TaskItem {
        final String id;
        final String projectId;
        final String title;
        /** One of no-priority, low, medium, high, urgent. */
        final String priority;
        /** Epoch milliseconds, or null without a due date. */
        final Long dueDateMillis;

        TaskItem(String id, String projectId, String title, String priority, Long dueDateMillis) {
            this.id = id;
            this.projectId = projectId;
            this.title = title;
            this.priority = priority;
            this.dueDateMillis = dueDateMillis;
        }
    }

    static final class RunningTimer {
        /** The open time entry; {@code updateTimeEntry} closes it. */
        final String id;
        final String taskId;
        final String taskTitle;
        final String projectId;
        final String projectName;
        final String workspaceId;
        final long startTimeMillis;

        RunningTimer(
            String id,
            String taskId,
            String taskTitle,
            String projectId,
            String projectName,
            String workspaceId,
            long startTimeMillis
        ) {
            this.id = id;
            this.taskId = taskId;
            this.taskTitle = taskTitle;
            this.projectId = projectId;
            this.projectName = projectName;
            this.workspaceId = workspaceId;
            this.startTimeMillis = startTimeMillis;
        }
    }

    final List<Project> projects;
    /** Open tasks assigned to the user, soonest due first; at most a page. */
    final List<TaskItem> tasks;
    /** All open assigned tasks, including any beyond the returned page. */
    final int total;
    /** The running timer, or null. */
    final RunningTimer runningTimer;
    final int unreadNotifications;

    private WidgetSummary(
        List<Project> projects,
        List<TaskItem> tasks,
        int total,
        RunningTimer runningTimer,
        int unreadNotifications
    ) {
        this.projects = Collections.unmodifiableList(projects);
        this.tasks = Collections.unmodifiableList(tasks);
        this.total = total;
        this.runningTimer = runningTimer;
        this.unreadNotifications = unreadNotifications;
    }

    /** The project a task belongs to, or null when the summary did not include it. */
    Project project(TaskItem task) {
        for (Project project : projects) {
            if (project.id.equals(task.projectId)) {
                return project;
            }
        }
        return null;
    }

    /** How many tasks need attention today: due today or already overdue. */
    int dueNowCount(long nowMillis) {
        int count = 0;
        for (TaskItem task : tasks) {
            DueDates.Section section = DueDates.section(task.dueDateMillis, nowMillis);
            if (section == DueDates.Section.TODAY || section == DueDates.Section.OVERDUE) {
                count++;
            }
        }
        return count;
    }

    static WidgetSummary parse(String json) throws JSONException {
        JSONObject root = new JSONObject(json);
        try {
            List<Project> projects = new ArrayList<>();
            JSONArray projectArray = root.getJSONArray("projects");
            for (int index = 0; index < projectArray.length(); index++) {
                JSONObject project = projectArray.getJSONObject(index);
                projects.add(new Project(
                    project.getString("id"),
                    project.getString("name"),
                    project.getString("workspaceId")
                ));
            }

            List<TaskItem> tasks = new ArrayList<>();
            JSONArray taskArray = root.getJSONArray("tasks");
            for (int index = 0; index < taskArray.length(); index++) {
                JSONObject task = taskArray.getJSONObject(index);
                tasks.add(new TaskItem(
                    task.getString("id"),
                    task.getString("projectId"),
                    task.getString("title"),
                    task.getString("priority"),
                    task.isNull("dueDate") ? null : IsoTimestamps.parse(task.getString("dueDate"))
                ));
            }

            RunningTimer runningTimer = null;
            JSONObject timer = root.optJSONObject("runningTimer");
            if (timer != null) {
                runningTimer = new RunningTimer(
                    timer.getString("id"),
                    timer.getString("taskId"),
                    timer.getString("taskTitle"),
                    timer.getString("projectId"),
                    timer.getString("projectName"),
                    timer.getString("workspaceId"),
                    IsoTimestamps.parse(timer.getString("startTime"))
                );
            }

            return new WidgetSummary(
                projects,
                tasks,
                root.getInt("total"),
                runningTimer,
                root.getInt("unreadNotifications")
            );
        } catch (ParseException error) {
            throw new JSONException("Not an ISO 8601 timestamp: " + error.getMessage());
        }
    }
}
