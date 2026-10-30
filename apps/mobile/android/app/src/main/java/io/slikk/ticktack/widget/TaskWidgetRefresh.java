package io.slikk.ticktack.widget;

import android.appwidget.AppWidgetManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.util.Log;
import io.slikk.ticktack.NativeSession;
import io.slikk.ticktack.NativeSessionStore;
import io.slikk.ticktack.R;
import java.io.IOException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Fetches the summary off the main thread, caches it and redraws the widgets.
 * Both receivers hand over their {@code goAsync()} result, which keeps the
 * process alive until the fetch finishes.
 */
final class TaskWidgetRefresh {

    private static final String TAG = "TaskWidgetRefresh";
    // One fetch at a time: a burst of update requests must not race each other.
    private static final ExecutorService EXECUTOR = Executors.newSingleThreadExecutor();

    private TaskWidgetRefresh() {}

    /**
     * @param stopTimer whether to close the running timer first, from the
     *     widget's stop button
     */
    // notifyAppWidgetViewDataChanged is deprecated since Android 12 in favour
    // of RemoteCollectionItems, which does not exist before it; minSdk is 24.
    @SuppressWarnings("deprecation")
    static void start(Context context, BroadcastReceiver.PendingResult pending, int[] ids, boolean stopTimer) {
        Context application = context.getApplicationContext();
        EXECUTOR.execute(() -> {
            try {
                fetch(application, stopTimer);
            } finally {
                AppWidgetManager manager = AppWidgetManager.getInstance(application);
                render(application, manager, ids);
                manager.notifyAppWidgetViewDataChanged(ids, R.id.widget_list);
                pending.finish();
            }
        });
    }

    /** Draws every widget from the cache. */
    static void render(Context context, AppWidgetManager manager, int[] ids) {
        for (int id : ids) {
            manager.updateAppWidget(id, TaskWidgetViews.build(context, id));
        }
    }

    private static void fetch(Context context, boolean stopTimer) {
        NativeSession session = NativeSessionStore.current(context);
        if (session == null) {
            WidgetSummaryCache.saveSignedOut(context);
            return;
        }
        WidgetApi api = new WidgetApi(session);
        try {
            if (stopTimer) {
                WidgetSummary cached = WidgetSummaryCache.summary(context);
                if (cached != null && cached.runningTimer != null) {
                    api.stopTimer(cached.runningTimer);
                }
            }
            WidgetSummaryCache.saveLoaded(context, api.fetchSummary());
        } catch (WidgetApi.UnauthorizedException error) {
            // The session expired; the app signs in again and pushes a new token.
            WidgetSummaryCache.saveSignedOut(context);
        } catch (IOException | RuntimeException error) {
            Log.w(TAG, "Could not refresh the widget", error);
            WidgetSummaryCache.saveUnavailable(context);
        }
    }
}
