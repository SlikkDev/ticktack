package io.slikk.ticktack;

/** The session the web shell hands to native code; see {@link NativeSessionStore}. */
public final class NativeSession {

    /** Base URL ending in {@code /api}, for example https://ticktack.slikk.io/api. */
    public final String apiBaseUrl;

    /** Origin of the web app; links that open the app on a page start here. */
    public final String clientUrl;

    public final String token;

    NativeSession(String apiBaseUrl, String clientUrl, String token) {
        this.apiBaseUrl = apiBaseUrl;
        this.clientUrl = clientUrl;
        this.token = token;
    }
}
