package io.slikk.ticktack;

import android.content.Context;
import android.util.Log;
import com.google.android.gms.wearable.DataMap;
import com.google.android.gms.wearable.PutDataMapRequest;
import com.google.android.gms.wearable.PutDataRequest;
import com.google.android.gms.wearable.Wearable;

/**
 * Keeps the paired Wear OS watch signed in.
 *
 * The web app pushes the API base URL and the bearer token through the
 * NativeSession plugin on every launch and token change; {@link NativeSessionStore}
 * keeps them and this relay publishes them as a Data Layer item, which the
 * watch receives as soon as it is connected, even if its app is not running.
 * The watch can also ask for the session with a message (see
 * {@link WatchMessageService}).
 */
final class WatchSessionRelay {

    private static final String TAG = "WatchSessionRelay";

    // Paths and keys shared with apps/mobile/android/wear.
    static final String SESSION_PATH = "/ticktack/session";
    static final String REQUEST_SESSION_PATH = "/ticktack/request-session";
    static final String API_URL_KEY = "apiUrl";
    static final String TOKEN_KEY = "token";
    static final String UPDATED_AT_KEY = "updatedAt";

    private WatchSessionRelay() {}

    /**
     * Publishes the stored session to every paired watch. Call after every
     * change; a session without a token signs the watch out.
     */
    static void publish(Context context) {
        String apiUrl = NativeSessionStore.apiUrl(context);
        if (apiUrl == null) {
            return;
        }

        PutDataMapRequest request = PutDataMapRequest.create(SESSION_PATH);
        DataMap data = request.getDataMap();
        data.putString(API_URL_KEY, apiUrl);
        String token = NativeSessionStore.token(context);
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
}
