package io.slikk.ticktack.wear.ui

import androidx.compose.runtime.Composable
import androidx.compose.ui.res.stringResource
import io.slikk.ticktack.wear.R
import io.slikk.ticktack.wear.api.WatchSummary
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.Locale

enum class TaskSection(val titleRes: Int) {
    OVERDUE(R.string.section_overdue),
    TODAY(R.string.section_today),
    UPCOMING(R.string.section_upcoming),
    UNDATED(R.string.section_undated),
}

data class TaskGroup(val section: TaskSection, val tasks: List<WatchSummary.TaskItem>)

/** Where a task belongs relative to the wearer's calendar day. */
fun sectionFor(
    dueDate: Instant?,
    today: LocalDate = LocalDate.now(),
    zone: ZoneId = ZoneId.systemDefault(),
): TaskSection {
    val day = dueDate?.atZone(zone)?.toLocalDate() ?: return TaskSection.UNDATED
    return when {
        day.isEqual(today) -> TaskSection.TODAY
        day.isBefore(today) -> TaskSection.OVERDUE
        else -> TaskSection.UPCOMING
    }
}

/**
 * Keeps the server's order (soonest due, then priority) inside each group and
 * drops empty groups.
 */
fun groupTasks(
    tasks: List<WatchSummary.TaskItem>,
    today: LocalDate = LocalDate.now(),
    zone: ZoneId = ZoneId.systemDefault(),
): List<TaskGroup> = TaskSection.entries.mapNotNull { section ->
    tasks.filter { sectionFor(it.dueDate, today, zone) == section }
        .takeIf { it.isNotEmpty() }
        ?.let { TaskGroup(section, it) }
}

@Composable
fun dueDateLabel(dueDate: Instant): String {
    val zone = ZoneId.systemDefault()
    val day = dueDate.atZone(zone).toLocalDate()
    val today = LocalDate.now(zone)
    return when (day) {
        today -> stringResource(R.string.due_today)
        today.plusDays(1) -> stringResource(R.string.due_tomorrow)
        today.minusDays(1) -> stringResource(R.string.due_yesterday)
        else -> day.format(DateTimeFormatter.ofPattern("d MMM", Locale.getDefault()))
    }
}

fun longDueDateLabel(dueDate: Instant): String =
    dueDate.atZone(ZoneId.systemDefault()).toLocalDate()
        .format(DateTimeFormatter.ofPattern("EEE d MMM", Locale.getDefault()))

/** h:mm:ss once an hour has passed, mm:ss before that. */
fun formatElapsed(seconds: Long): String {
    val clamped = seconds.coerceAtLeast(0)
    val hours = clamped / 3600
    val minutes = (clamped % 3600) / 60
    val rest = clamped % 60
    return if (hours > 0) {
        String.format(Locale.getDefault(), "%d:%02d:%02d", hours, minutes, rest)
    } else {
        String.format(Locale.getDefault(), "%02d:%02d", minutes, rest)
    }
}
