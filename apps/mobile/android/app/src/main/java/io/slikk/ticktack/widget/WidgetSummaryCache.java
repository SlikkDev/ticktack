package io.slikk.ticktack.widget;

import android.content.Context;
import android.content.SharedPreferences;
import org.json.JSONException;

/**
 * The last summary the widget fetched, so a relayout, a reboot or a failed
 * refresh can still show tasks, and the list rows (TaskListFactory) read the
 * same data the frame was drawn from.
 */
final class WidgetSummaryCache {

    enum State {
        /** Nothing fetched yet. */
        NONE,
        LOADED,
        /** The phone app has not signed in, or the API rejected the token. */
        SIGNED_OUT,
        /** The last refresh failed; the cached summary, if any, is stale. */
        UNAVAILABLE,
    }

    private static final String PREFERENCES = "io.slikk.ticktack.widget";
    private static final String STATE_KEY = "state";
    private static final String SUMMARY_KEY = "summary";

    private WidgetSummaryCache() {}

    static void saveLoaded(Context context, String summaryJson) {
        preferences(context).edit()
            .putString(STATE_KEY, State.LOADED.name())
            .putString(SUMMARY_KEY, summaryJson)
            .apply();
    }

    /** Signed out: another user's tasks must not linger. */
    static void saveSignedOut(Context context) {
        preferences(context).edit()
            .putString(STATE_KEY, State.SIGNED_OUT.name())
            .remove(SUMMARY_KEY)
            .apply();
    }

    /** Keeps the stale summary for display. */
    static void saveUnavailable(Context context) {
        preferences(context).edit().putString(STATE_KEY, State.UNAVAILABLE.name()).apply();
    }

    static void clear(Context context) {
        preferences(context).edit().clear().apply();
    }

    static State state(Context context) {
        String name = preferences(context).getString(STATE_KEY, null);
        if (name == null) {
            return State.NONE;
        }
        try {
            return State.valueOf(name);
        } catch (IllegalArgumentException error) {
            return State.NONE;
        }
    }

    /** The cached summary, or null when none is stored or it no longer parses. */
    static WidgetSummary summary(Context context) {
        String json = preferences(context).getString(SUMMARY_KEY, null);
        if (json == null) {
            return null;
        }
        try {
            return WidgetSummary.parse(json);
        } catch (JSONException error) {
            return null;
        }
    }

    private static SharedPreferences preferences(Context context) {
        return context.getApplicationContext().getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE);
    }
}
