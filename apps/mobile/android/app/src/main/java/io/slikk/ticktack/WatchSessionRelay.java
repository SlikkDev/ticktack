package io.slikk.ticktack;

import android.content.Context;
import android.content.SharedPreferences;
import android.util.Log;
import com.google.android.gms.wearable.DataMap;
import com.google.android.gms.wearable.PutDataMapRequest;
import com.google.android.gms.wearable.PutDataRequest;
import com.google.android.gms.wearable.Wearable;

/**
 * Keeps the paired Wear OS watch signed in.
 *
 * The web app pushes the API base URL and the bearer token through the
 * NativeSession plugin on every launch and token change. This relay stores them
 * and publishes them as a Data Layer item, which the watch receives as soon
 * as it is connected, even if its app is not running. The watch can also ask
 * for the session with a message (see {@link WatchMessageService}).
 */
final class WatchSessionRelay {

    private static final String TAG = "WatchSessionRelay";

    // Paths and keys shared with apps/mobile/android/wear.
    static final String SESSION_PATH = "/ticktack/session";
    static final String REQUEST_SESSION_PATH = "/ticktack/request-session";
    static final String API_URL_KEY = "apiUrl";
    static final String TOKEN_KEY = "token";
    static final String UPDATED_AT_KEY = "updatedAt";

    // App-private preferences, like Capacitor's own Preferences store that
    // holds the phone's copy of the token.
    private static final String PREFERENCES = "io.slikk.ticktack.watch";

    private WatchSessionRelay() {}

    /** Stores the session and sends it to the watch. A null token signs the watch out. */
    static void update(Context context, String apiUrl, String token) {
        SharedPreferences.Editor editor = preferences(context).edit().putString(API_URL_KEY, apiUrl);
        if (token == null || token.isEmpty()) {
            editor.remove(TOKEN_KEY);
        } else {
            editor.putString(TOKEN_KEY, token);
        }
        editor.apply();
        publish(context);
    }

    /** Publishes the stored session to every paired watch. */
    static void publish(Context context) {
        SharedPreferences preferences = preferences(context);
        String apiUrl = preferences.getString(API_URL_KEY, null);
        if (apiUrl == null) {
            return;
        }

        PutDataMapRequest request = PutDataMapRequest.create(SESSION_PATH);
        DataMap data = request.getDataMap();
        data.putString(API_URL_KEY, apiUrl);
        String token = preferences.getString(TOKEN_KEY, null);
        if (token != null) {
            data.putString(TOKEN_KEY, token);
        }
        // The Data Layer only delivers an item whose content changed, so a
        // sign-out followed by a sign-in with the same token needs a fresh
        // timestamp to reach the watch.
        data.putLong(UPDATED_AT_KEY, System.currentTimeMillis());

        PutDataRequest putRequest = request.asPutDataRequest().setUrgent();
        Wearable.getDataClient(context)
            .putDataItem(putRequest)
            .addOnFailureListener(error -> Log.w(TAG, "Could not publish the session to the watch", error));
    }

    private static SharedPreferences preferences(Context context) {
        return context.getApplicationContext().getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE);
    }
}
