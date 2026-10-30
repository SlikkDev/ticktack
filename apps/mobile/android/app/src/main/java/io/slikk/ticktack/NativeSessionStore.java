package io.slikk.ticktack;

import android.content.Context;
import android.content.SharedPreferences;
import android.net.Uri;

/**
 * Keeps the session the web shell hands over through {@link NativeSessionPlugin}
 * for code that runs outside the WebView: the home screen widget calls the API
 * with it, and {@link WatchSessionRelay} forwards it to the paired Wear OS
 * watch. It lives in app-private preferences, like Capacitor's own Preferences
 * store that holds the phone's copy of the token; backups exclude them
 * ({@code allowBackup="false"}).
 */
public final class NativeSessionStore {

    // The file keeps the name of its first consumer, so an update does not
    // drop a stored session.
    private static final String PREFERENCES = "io.slikk.ticktack.watch";
    private static final String API_URL_KEY = "apiUrl";
    private static final String CLIENT_URL_KEY = "clientUrl";
    private static final String TOKEN_KEY = "token";

    private NativeSessionStore() {}

    /**
     * Replaces the stored session. A null or empty token signs native code out
     * but keeps the URLs, so the watch can still be told to sign out.
     */
    static void save(Context context, String apiUrl, String clientUrl, String token) {
        SharedPreferences.Editor editor = preferences(context).edit().putString(API_URL_KEY, apiUrl);
        if (clientUrl == null || clientUrl.isEmpty()) {
            editor.remove(CLIENT_URL_KEY);
        } else {
            editor.putString(CLIENT_URL_KEY, clientUrl);
        }
        if (token == null || token.isEmpty()) {
            editor.remove(TOKEN_KEY);
        } else {
            editor.putString(TOKEN_KEY, token);
        }
        editor.apply();
    }

    /** The API base URL, or null until the web shell has launched once. */
    static String apiUrl(Context context) {
        return preferences(context).getString(API_URL_KEY, null);
    }

    /** The bearer token, or null while signed out. */
    static String token(Context context) {
        return preferences(context).getString(TOKEN_KEY, null);
    }

    /** The signed-in session, or null until the web app has signed in. */
    public static NativeSession current(Context context) {
        SharedPreferences preferences = preferences(context);
        String apiUrl = preferences.getString(API_URL_KEY, null);
        String token = preferences.getString(TOKEN_KEY, null);
        if (apiUrl == null || token == null) {
            return null;
        }
        String clientUrl = preferences.getString(CLIENT_URL_KEY, null);
        if (clientUrl == null || clientUrl.isEmpty()) {
            // A build that does not know the client URL serves the web app
            // from the API origin, which is where the bundled deployment
            // serves both.
            clientUrl = origin(apiUrl);
        }
        if (clientUrl == null) {
            return null;
        }
        return new NativeSession(apiUrl, clientUrl, token);
    }

    private static String origin(String url) {
        Uri uri = Uri.parse(url);
        if (uri.getScheme() == null || uri.getHost() == null) {
            return null;
        }
        String port = uri.getPort() > 0 ? ":" + uri.getPort() : "";
        return uri.getScheme() + "://" + uri.getHost() + port;
    }

    private static SharedPreferences preferences(Context context) {
        return context.getApplicationContext().getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE);
    }
}
