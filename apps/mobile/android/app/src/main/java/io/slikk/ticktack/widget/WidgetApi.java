package io.slikk.ticktack.widget;

import io.slikk.ticktack.NativeSession;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import org.json.JSONException;
import org.json.JSONObject;

/**
 * The two API calls the widget makes, authenticated with the bearer token the
 * web shell stored. Paths are relative to the API base URL.
 */
final class WidgetApi {

    /** The token was rejected; the app must sign in again. */
    static final class UnauthorizedException extends IOException {
        private static final long serialVersionUID = 1L;

        UnauthorizedException() {
            super("Unauthorized");
        }
    }

    // A widget refresh runs inside a broadcast, which the system gives about
    // ten seconds; the summary is small and normally arrives well within that.
    private static final int CONNECT_TIMEOUT_MILLIS = 4_000;
    private static final int READ_TIMEOUT_MILLIS = 5_000;

    private final NativeSession session;

    WidgetApi(NativeSession session) {
        this.session = session;
    }

    /** {@code getWatchSummary}, as the raw JSON the cache keeps. */
    String fetchSummary() throws IOException {
        return request("GET", "watch/summary", null);
    }

    /** {@code updateTimeEntry}: closes the running entry now. */
    void stopTimer(WidgetSummary.RunningTimer timer) throws IOException {
        try {
            JSONObject body = new JSONObject()
                .put("startTime", IsoTimestamps.format(timer.startTimeMillis))
                .put("endTime", IsoTimestamps.format(System.currentTimeMillis()));
            request("PUT", "time-entry/" + timer.id, body.toString());
        } catch (JSONException error) {
            throw new IOException(error);
        }
    }

    private String request(String method, String path, String body) throws IOException {
        String base = session.apiBaseUrl.endsWith("/") ? session.apiBaseUrl : session.apiBaseUrl + "/";
        HttpURLConnection connection = (HttpURLConnection) URI.create(base + path).toURL().openConnection();
        try {
            connection.setRequestMethod(method);
            connection.setConnectTimeout(CONNECT_TIMEOUT_MILLIS);
            connection.setReadTimeout(READ_TIMEOUT_MILLIS);
            connection.setRequestProperty("Authorization", "Bearer " + session.token);
            connection.setRequestProperty("Accept", "application/json");
            if (body != null) {
                connection.setDoOutput(true);
                connection.setRequestProperty("Content-Type", "application/json");
                try (OutputStream output = connection.getOutputStream()) {
                    output.write(body.getBytes(StandardCharsets.UTF_8));
                }
            }

            int status = connection.getResponseCode();
            if (status == 401) {
                throw new UnauthorizedException();
            }
            InputStream stream = status >= 200 && status < 300 ? connection.getInputStream() : connection.getErrorStream();
            String text = read(stream);
            if (status >= 200 && status < 300) {
                return text;
            }
            throw new IOException("HTTP " + status + " " + path + (text.isEmpty() ? "" : ": " + errorMessage(text)));
        } finally {
            connection.disconnect();
        }
    }

    private static String read(InputStream stream) throws IOException {
        if (stream == null) {
            return "";
        }
        StringBuilder text = new StringBuilder();
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(stream, StandardCharsets.UTF_8))) {
            char[] buffer = new char[4096];
            int count;
            while ((count = reader.read(buffer)) != -1) {
                text.append(buffer, 0, count);
            }
        }
        return text.toString();
    }

    private static String errorMessage(String text) {
        try {
            String message = new JSONObject(text).optString("message");
            return message.isEmpty() ? text : message;
        } catch (JSONException error) {
            return text;
        }
    }
}
