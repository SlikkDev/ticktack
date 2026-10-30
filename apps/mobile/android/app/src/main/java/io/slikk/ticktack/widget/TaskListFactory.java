package io.slikk.ticktack.widget;

import android.content.Context;
import android.content.Intent;
import android.view.View;
import android.widget.RemoteViews;
import android.widget.RemoteViewsService;
import io.slikk.ticktack.NativeSession;
import io.slikk.ticktack.NativeSessionStore;
import io.slikk.ticktack.R;
import java.util.Collections;
import java.util.List;

/**
 * One row per cached task (res/layout/widget_task_row.xml): priority marker,
 * title, project and due label. A tap fills the frame's pending intent
 * template with the task's URL.
 */
final class TaskListFactory implements RemoteViewsService.RemoteViewsFactory {

    private final Context context;
    private WidgetSummary summary;
    private List<WidgetSummary.TaskItem> tasks = Collections.emptyList();
    private AppLinks links;

    TaskListFactory(Context context) {
        this.context = context;
    }

    @Override
    public void onCreate() {}

    @Override
    public void onDataSetChanged() {
        // Called on a worker thread after notifyAppWidgetViewDataChanged.
        summary = WidgetSummaryCache.summary(context);
        tasks = summary == null ? Collections.<WidgetSummary.TaskItem>emptyList() : summary.tasks;
        NativeSession session = NativeSessionStore.current(context);
        links = session == null ? null : new AppLinks(context, session.clientUrl);
    }

    @Override
    public void onDestroy() {}

    @Override
    public int getCount() {
        return tasks.size();
    }

    @Override
    public RemoteViews getViewAt(int position) {
        WidgetSummary.TaskItem task = tasks.get(position);
        RemoteViews row = new RemoteViews(context.getPackageName(), R.layout.widget_task_row);
        row.setTextViewText(R.id.widget_row_title, task.title);

        WidgetSummary.Project project = summary.project(task);
        row.setTextViewText(R.id.widget_row_project, project == null ? "" : project.name);
        row.setViewVisibility(R.id.widget_row_project, project == null ? View.GONE : View.VISIBLE);

        row.setInt(R.id.widget_row_priority, "setColorFilter", context.getColor(priorityColor(task.priority)));

        long now = System.currentTimeMillis();
        if (task.dueDateMillis == null) {
            row.setViewVisibility(R.id.widget_row_due, View.GONE);
        } else {
            boolean overdue = DueDates.section(task.dueDateMillis, now) == DueDates.Section.OVERDUE;
            row.setTextViewText(R.id.widget_row_due, DueDates.label(context, task.dueDateMillis, now));
            row.setTextColor(R.id.widget_row_due, context.getColor(overdue ? R.color.widget_overdue : R.color.widget_text_secondary));
            row.setViewVisibility(R.id.widget_row_due, View.VISIBLE);
        }

        if (links != null) {
            row.setOnClickFillInIntent(R.id.widget_task_row, new Intent().setData(links.taskUri(task, summary)));
        }
        return row;
    }

    /** Only priorities that need attention get a colour; the rest stay quiet. */
    private static int priorityColor(String priority) {
        switch (priority) {
            case "urgent":
                return R.color.widget_priority_urgent;
            case "high":
                return R.color.widget_priority_high;
            case "medium":
                return R.color.widget_priority_medium;
            default:
                return R.color.widget_priority_none;
        }
    }

    @Override
    public RemoteViews getLoadingView() {
        return null;
    }

    @Override
    public int getViewTypeCount() {
        return 1;
    }

    @Override
    public long getItemId(int position) {
        return position;
    }

    @Override
    public boolean hasStableIds() {
        return false;
    }
}
