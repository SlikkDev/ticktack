package io.slikk.ticktack.widget;

import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

/**
 * The widget's own buttons. Not exported, so only this app's pending intents
 * reach it: nothing else on the device can stop the user's timer.
 */
public class TaskWidgetActions extends BroadcastReceiver {

    private static final String ACTION_REFRESH = "io.slikk.ticktack.widget.REFRESH";
    private static final String ACTION_STOP_TIMER = "io.slikk.ticktack.widget.STOP_TIMER";

    static PendingIntent refresh(Context context) {
        return broadcast(context, 0, ACTION_REFRESH);
    }

    static PendingIntent stopTimer(Context context) {
        return broadcast(context, 1, ACTION_STOP_TIMER);
    }

    /**
     * Flags for a pending intent whose content is final. Android 12 requires
     * mutability to be explicit.
     */
    static int immutableFlags() {
        return PendingIntent.FLAG_UPDATE_CURRENT
            | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S ? PendingIntent.FLAG_IMMUTABLE : 0);
    }

    /** Flags for a template that the task rows fill in with their URL. */
    static int mutableFlags() {
        return PendingIntent.FLAG_UPDATE_CURRENT
            | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S ? PendingIntent.FLAG_MUTABLE : 0);
    }

    private static PendingIntent broadcast(Context context, int requestCode, String action) {
        Intent intent = new Intent(context, TaskWidgetActions.class).setAction(action);
        return PendingIntent.getBroadcast(context, requestCode, intent, immutableFlags());
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent.getAction();
        if (!ACTION_REFRESH.equals(action) && !ACTION_STOP_TIMER.equals(action)) {
            return;
        }
        int[] ids = TaskWidgetProvider.widgetIds(context);
        if (ids.length == 0) {
            return;
        }
        TaskWidgetRefresh.start(context, goAsync(), ids, ACTION_STOP_TIMER.equals(action));
    }
}
