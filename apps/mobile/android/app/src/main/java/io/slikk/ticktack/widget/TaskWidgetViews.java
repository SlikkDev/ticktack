package io.slikk.ticktack.widget;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.SystemClock;
import android.view.View;
import android.widget.RemoteViews;
import io.slikk.ticktack.MainActivity;
import io.slikk.ticktack.NativeSession;
import io.slikk.ticktack.NativeSessionStore;
import io.slikk.ticktack.R;

/**
 * Draws the widget frame (res/layout/widget_tasks.xml) from the cache: header
 * with the due count, unread count and buttons; the running timer; and the
 * task list, whose rows come from {@link TaskListService}.
 */
final class TaskWidgetViews {

    // Request codes keep the activity pending intents apart.
    private static final int REQUEST_WHATS_NEXT = 10;
    private static final int REQUEST_CREATE_TASK = 11;
    private static final int REQUEST_INBOX = 12;
    private static final int REQUEST_TIMER_TASK = 13;
    private static final int REQUEST_ROW_TEMPLATE = 14;

    private TaskWidgetViews() {}

    // setRemoteAdapter(int, Intent) is deprecated since Android 12 in favour of
    // RemoteCollectionItems, which does not exist before it; minSdk is 24.
    @SuppressWarnings("deprecation")
    static RemoteViews build(Context context, int appWidgetId) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_tasks);
        WidgetSummaryCache.State state = WidgetSummaryCache.state(context);
        WidgetSummary summary = WidgetSummaryCache.summary(context);
        NativeSession session = NativeSessionStore.current(context);
        AppLinks links = session == null ? null : new AppLinks(context, session.clientUrl);

        views.setOnClickPendingIntent(R.id.widget_refresh, TaskWidgetActions.refresh(context));
        if (links != null) {
            views.setOnClickPendingIntent(R.id.widget_header, activity(context, REQUEST_WHATS_NEXT, links.whatsNext()));
            views.setOnClickPendingIntent(R.id.widget_new_task, activity(context, REQUEST_CREATE_TASK, links.createTask()));
        }
        views.setViewVisibility(R.id.widget_new_task, links == null ? View.GONE : View.VISIBLE);

        if (summary == null) {
            int message;
            switch (state) {
                case SIGNED_OUT:
                    message = R.string.widget_signed_out;
                    break;
                case UNAVAILABLE:
                    message = R.string.widget_unavailable;
                    break;
                default:
                    message = R.string.widget_loading;
                    break;
            }
            views.setTextViewText(R.id.widget_message, context.getString(message));
            views.setViewVisibility(R.id.widget_message, View.VISIBLE);
            views.setViewVisibility(R.id.widget_subtitle, View.GONE);
            views.setViewVisibility(R.id.widget_unread, View.GONE);
            views.setViewVisibility(R.id.widget_timer, View.GONE);
            views.setViewVisibility(R.id.widget_list, View.GONE);
            views.setViewVisibility(R.id.widget_empty, View.GONE);
            views.setViewVisibility(R.id.widget_more, View.GONE);
            return views;
        }

        views.setViewVisibility(R.id.widget_message, View.GONE);
        long now = System.currentTimeMillis();

        int due = summary.dueNowCount(now);
        views.setTextViewText(R.id.widget_subtitle, context.getResources().getQuantityString(R.plurals.widget_due_now, due, due));
        views.setViewVisibility(R.id.widget_subtitle, due > 0 ? View.VISIBLE : View.GONE);

        int unread = summary.unreadNotifications;
        views.setTextViewText(R.id.widget_unread, context.getResources().getQuantityString(R.plurals.widget_unread, unread, unread));
        views.setViewVisibility(R.id.widget_unread, unread > 0 ? View.VISIBLE : View.GONE);
        if (links != null) {
            views.setOnClickPendingIntent(R.id.widget_unread, activity(context, REQUEST_INBOX, links.inbox()));
        }

        WidgetSummary.RunningTimer timer = summary.runningTimer;
        if (timer != null) {
            views.setViewVisibility(R.id.widget_timer, View.VISIBLE);
            views.setTextViewText(R.id.widget_timer_title, timer.taskTitle);
            views.setTextViewText(R.id.widget_timer_project, timer.projectName);
            // Chronometer counts from a point on the elapsed-realtime clock.
            long base = SystemClock.elapsedRealtime() - Math.max(0, now - timer.startTimeMillis);
            views.setChronometer(R.id.widget_timer_elapsed, base, null, true);
            views.setOnClickPendingIntent(R.id.widget_timer_stop, TaskWidgetActions.stopTimer(context));
            if (links != null) {
                views.setOnClickPendingIntent(R.id.widget_timer, activity(context, REQUEST_TIMER_TASK, links.task(timer)));
            }
        } else {
            views.setViewVisibility(R.id.widget_timer, View.GONE);
        }

        // The rows come from TaskListService; the intent must differ per
        // widget so the launcher keeps one factory for each.
        Intent service = new Intent(context, TaskListService.class)
            .putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId);
        service.setData(Uri.parse(service.toUri(Intent.URI_INTENT_SCHEME)));
        views.setRemoteAdapter(R.id.widget_list, service);
        views.setEmptyView(R.id.widget_list, R.id.widget_empty);
        views.setViewVisibility(R.id.widget_list, View.VISIBLE);
        // Each row fills the template in with its own URL (TaskListFactory).
        Intent template = new Intent(Intent.ACTION_VIEW)
            .setClass(context, MainActivity.class)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        views.setPendingIntentTemplate(
            R.id.widget_list,
            PendingIntent.getActivity(context, REQUEST_ROW_TEMPLATE, template, TaskWidgetActions.mutableFlags())
        );

        int more = summary.total - summary.tasks.size();
        views.setTextViewText(R.id.widget_more, context.getResources().getQuantityString(R.plurals.widget_more, more, more));
        views.setViewVisibility(R.id.widget_more, more > 0 ? View.VISIBLE : View.GONE);
        return views;
    }

    private static PendingIntent activity(Context context, int requestCode, Intent intent) {
        return PendingIntent.getActivity(context, requestCode, intent, TaskWidgetActions.immutableFlags());
    }
}
