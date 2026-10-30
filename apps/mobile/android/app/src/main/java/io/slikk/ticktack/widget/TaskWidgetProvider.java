package io.slikk.ticktack.widget;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;

/**
 * Home screen widget: the running timer and the user's next tasks, read from
 * {@code GET /api/watch/summary} with the session the web shell stored
 * ({@code NativeSessionStore}), like the Wear OS app does. Taps open the app
 * through its own links ({@link AppLinks}); the stop button calls the API
 * directly ({@link TaskWidgetActions}).
 *
 * The launcher asks for an update every 30 minutes (res/xml/task_widget_info.xml);
 * the app asks for one whenever the session changes or the user leaves it.
 */
public class TaskWidgetProvider extends AppWidgetProvider {

    /**
     * Re-renders every placed widget with fresh data. A no-op while no widget
     * is placed, so the app can call it freely.
     */
    public static void requestUpdate(Context context) {
        int[] ids = widgetIds(context);
        if (ids.length == 0) {
            return;
        }
        Intent intent = new Intent(context, TaskWidgetProvider.class)
            .setAction(AppWidgetManager.ACTION_APPWIDGET_UPDATE)
            .putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids);
        context.sendBroadcast(intent);
    }

    static int[] widgetIds(Context context) {
        return AppWidgetManager.getInstance(context)
            .getAppWidgetIds(new ComponentName(context, TaskWidgetProvider.class));
    }

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] appWidgetIds) {
        // Show what is cached right away, then fetch.
        TaskWidgetRefresh.render(context, manager, appWidgetIds);
        TaskWidgetRefresh.start(context, goAsync(), appWidgetIds, false);
    }

    @Override
    public void onDisabled(Context context) {
        // The last widget is gone; the cached tasks have no reader left.
        WidgetSummaryCache.clear(context);
    }
}
