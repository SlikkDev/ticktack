package io.slikk.ticktack.widget;

import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import java.util.TimeZone;

/**
 * The API's ISO 8601 UTC timestamps. java.time would need core library
 * desugaring below Android 8, which the phone app (minSdk 24) does not
 * enable, so this uses the classic formatter.
 */
final class IsoTimestamps {

    private static final String WITH_MILLIS = "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'";
    private static final String WITHOUT_MILLIS = "yyyy-MM-dd'T'HH:mm:ss'Z'";

    private IsoTimestamps() {}

    /** Epoch milliseconds of a timestamp such as 2026-10-30T12:00:00.000Z. */
    static long parse(String value) throws ParseException {
        try {
            return formatter(WITH_MILLIS).parse(value).getTime();
        } catch (ParseException withMillis) {
            return formatter(WITHOUT_MILLIS).parse(value).getTime();
        }
    }

    /** The form the API accepts in request bodies. */
    static String format(long millis) {
        return formatter(WITH_MILLIS).format(new Date(millis));
    }

    // SimpleDateFormat is not thread-safe; a new one per call is cheap here.
    private static SimpleDateFormat formatter(String pattern) {
        SimpleDateFormat formatter = new SimpleDateFormat(pattern, Locale.US);
        formatter.setTimeZone(TimeZone.getTimeZone("UTC"));
        formatter.setLenient(false);
        return formatter;
    }
}
