package io.slikk.ticktack.widget;

import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import io.slikk.ticktack.MainActivity;

/**
 * Links that open the app on a page. They are the web app's own URLs, which
 * the shell routes in-app (apps/web/src/lib/native/shell.ts,
 * {@code listenForAppLinks}), delivered as explicit VIEW intents to
 * MainActivity like the launcher shortcuts in res/xml/shortcuts.xml, so they
 * work without App Links verification and need no native routes.
 */
final class AppLinks {

    private final Context context;
    private final Uri clientUrl;

    /** @param clientUrl origin of the web app, from the NativeSession hand-off. */
    AppLinks(Context context, String clientUrl) {
        this.context = context.getApplicationContext();
        this.clientUrl = Uri.parse(clientUrl);
    }

    /** My tasks, through the assistant route that first resolves the active workspace. */
    Intent whatsNext() {
        return open(page("/dashboard/assistant/whats-next", null, null));
    }

    /** The create-task dialog. */
    Intent createTask() {
        return open(page("/dashboard/assistant/create-task", null, null));
    }

    Intent inbox() {
        return open(page("/dashboard/assistant/open", "feature", "inbox"));
    }

    Intent task(WidgetSummary.RunningTimer timer) {
        return open(taskPage(timer.workspaceId, timer.projectId, timer.taskId));
    }

    /** The task's page, or My tasks when the summary did not include its project. */
    Uri taskUri(WidgetSummary.TaskItem task, WidgetSummary summary) {
        WidgetSummary.Project project = summary.project(task);
        if (project == null) {
            return page("/dashboard/assistant/whats-next", null, null);
        }
        return taskPage(project.workspaceId, project.id, task.id);
    }

    /** An explicit intent for MainActivity; rows of the task list add the URL to a copy of it. */
    Intent open(Uri uri) {
        return new Intent(Intent.ACTION_VIEW, uri)
            .setClass(context, MainActivity.class)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
    }

    private Uri taskPage(String workspaceId, String projectId, String taskId) {
        return page("/dashboard/workspace/" + workspaceId + "/project/" + projectId + "/task/" + taskId, null, null);
    }

    private Uri page(String path, String queryKey, String queryValue) {
        Uri.Builder builder = clientUrl.buildUpon().path(path).clearQuery().fragment(null);
        if (queryKey != null) {
            builder.appendQueryParameter(queryKey, queryValue);
        }
        return builder.build();
    }
}
