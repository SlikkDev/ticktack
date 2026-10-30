package io.slikk.ticktack.widget;

import android.content.Context;
import android.text.format.DateFormat;
import io.slikk.ticktack.R;
import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Date;
import java.util.Locale;

/** Due dates relative to the user's calendar day, like the watch apps show them. */
final class DueDates {

    enum Section { OVERDUE, TODAY, UPCOMING, UNDATED }

    private DueDates() {}

    /** Where a task belongs relative to the user's calendar day; null means no due date. */
    static Section section(Long dueMillis, long nowMillis) {
        if (dueMillis == null) {
            return Section.UNDATED;
        }
        int days = dayDifference(dueMillis, nowMillis);
        if (days == 0) {
            return Section.TODAY;
        }
        return days < 0 ? Section.OVERDUE : Section.UPCOMING;
    }

    /** "Today", "Tomorrow", "Yesterday" or a short date such as "4 Mar". */
    static String label(Context context, long dueMillis, long nowMillis) {
        switch (dayDifference(dueMillis, nowMillis)) {
            case 0:
                return context.getString(R.string.widget_due_today);
            case 1:
                return context.getString(R.string.widget_due_tomorrow);
            case -1:
                return context.getString(R.string.widget_due_yesterday);
            default:
                Locale locale = Locale.getDefault();
                String pattern = DateFormat.getBestDateTimePattern(locale, "dMMM");
                return new SimpleDateFormat(pattern, locale).format(new Date(dueMillis));
        }
    }

    /** Whole calendar days from now to the due date in the default time zone. */
    private static int dayDifference(long dueMillis, long nowMillis) {
        Calendar due = startOfDay(dueMillis);
        Calendar now = startOfDay(nowMillis);
        long dayMillis = 24L * 60 * 60 * 1000;
        // Days are whole here, so the rounding only absorbs daylight saving shifts.
        return (int) Math.round((due.getTimeInMillis() - now.getTimeInMillis()) / (double) dayMillis);
    }

    private static Calendar startOfDay(long millis) {
        Calendar calendar = Calendar.getInstance();
        calendar.setTimeInMillis(millis);
        calendar.set(Calendar.HOUR_OF_DAY, 0);
        calendar.set(Calendar.MINUTE, 0);
        calendar.set(Calendar.SECOND, 0);
        calendar.set(Calendar.MILLISECOND, 0);
        return calendar;
    }
}
