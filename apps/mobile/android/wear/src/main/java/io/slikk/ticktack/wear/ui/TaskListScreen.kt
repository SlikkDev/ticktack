package io.slikk.ticktack.wear.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.pluralStringResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.wear.compose.foundation.lazy.ScalingLazyColumn
import androidx.wear.compose.foundation.lazy.items
import androidx.wear.compose.foundation.lazy.rememberScalingLazyListState
import androidx.wear.compose.material.Button
import androidx.wear.compose.material.ButtonDefaults
import androidx.wear.compose.material.Chip
import androidx.wear.compose.material.ChipDefaults
import androidx.wear.compose.material.CircularProgressIndicator
import androidx.wear.compose.material.Icon
import androidx.wear.compose.material.ListHeader
import androidx.wear.compose.material.MaterialTheme
import androidx.wear.compose.material.PositionIndicator
import androidx.wear.compose.material.Scaffold
import androidx.wear.compose.material.Text
import androidx.wear.compose.material.TimeText
import androidx.wear.compose.material.Vignette
import androidx.wear.compose.material.VignettePosition
import io.slikk.ticktack.wear.R
import io.slikk.ticktack.wear.api.WatchSummary
import java.time.Duration
import java.time.Instant
import kotlinx.coroutines.delay

@Composable
fun TaskListScreen(viewModel: SummaryViewModel, onOpenTask: (WatchSummary.TaskItem) -> Unit) {
    val summary by viewModel.summary.collectAsStateWithLifecycle()
    val isLoading by viewModel.isLoading.collectAsStateWithLifecycle()
    val hasLoaded by viewModel.hasLoaded.collectAsStateWithLifecycle()
    val errorMessage by viewModel.errorMessage.collectAsStateWithLifecycle()
    val busyTaskIds by viewModel.busyTaskIds.collectAsStateWithLifecycle()
    val listState = rememberScalingLazyListState()

    LaunchedEffect(Unit) { viewModel.refresh() }

    Scaffold(
        timeText = { TimeText() },
        vignette = { Vignette(vignettePosition = VignettePosition.TopAndBottom) },
        positionIndicator = { PositionIndicator(scalingLazyListState = listState) },
    ) {
        ScalingLazyColumn(state = listState, modifier = Modifier.fillMaxSize()) {
            summary.runningTimer?.let { timer ->
                item(key = "timer") {
                    RunningTimerCard(
                        timer = timer,
                        isBusy = timer.taskId in busyTaskIds,
                        onStop = viewModel::stopTimer,
                    )
                }
            }

            if (summary.unreadNotifications > 0) {
                item(key = "notifications") {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            Icons.Filled.Notifications,
                            contentDescription = null,
                            modifier = Modifier.size(ChipDefaults.SmallIconSize),
                        )
                        Spacer(Modifier.width(4.dp))
                        Text(
                            pluralStringResource(
                                R.plurals.notifications_unread,
                                summary.unreadNotifications,
                                summary.unreadNotifications,
                            ),
                            style = MaterialTheme.typography.caption2,
                        )
                    }
                }
            }

            errorMessage?.let { message ->
                item(key = "error") {
                    Text(
                        message,
                        color = MaterialTheme.colors.error,
                        style = MaterialTheme.typography.caption2,
                        textAlign = TextAlign.Center,
                    )
                }
            }

            if (isLoading && !hasLoaded) {
                item(key = "loading") { CircularProgressIndicator() }
            }

            if (hasLoaded && summary.tasks.isEmpty()) {
                item(key = "empty") {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(stringResource(R.string.tasks_empty_title), style = MaterialTheme.typography.title3)
                        Text(
                            stringResource(R.string.tasks_empty_body),
                            style = MaterialTheme.typography.caption2,
                            textAlign = TextAlign.Center,
                        )
                    }
                }
            }

            for (group in groupTasks(summary.tasks)) {
                item(key = "header-${group.section.name}") {
                    ListHeader { Text(stringResource(group.section.titleRes)) }
                }
                items(group.tasks, key = { it.id }) { task ->
                    TaskChip(task = task, project = summary.project(task), onClick = { onOpenTask(task) })
                }
            }

            val remaining = summary.total - summary.tasks.size
            if (remaining > 0) {
                item(key = "more") {
                    Text(
                        pluralStringResource(R.plurals.tasks_more, remaining, remaining),
                        style = MaterialTheme.typography.caption2,
                        textAlign = TextAlign.Center,
                    )
                }
            }

            item(key = "refresh") {
                Button(
                    onClick = viewModel::refresh,
                    enabled = !isLoading,
                    colors = ButtonDefaults.secondaryButtonColors(),
                ) {
                    Icon(Icons.Filled.Refresh, contentDescription = stringResource(R.string.tasks_refresh))
                }
            }
        }
    }
}

@Composable
private fun TaskChip(task: WatchSummary.TaskItem, project: WatchSummary.Project?, onClick: () -> Unit) {
    val priorityColor = priorityColor(task.priority)
    val icon: (@Composable BoxScope.() -> Unit)? = if (priorityColor == null) {
        null
    } else {
        { Box(Modifier.size(8.dp).clip(CircleShape).background(priorityColor)) }
    }
    val dueLabel = task.dueDate?.let { dueDateLabel(it) }
    val details = listOfNotNull(project?.name, dueLabel)

    Chip(
        onClick = onClick,
        modifier = Modifier.fillMaxWidth(),
        colors = ChipDefaults.secondaryChipColors(),
        icon = icon,
        label = { Text(task.title, maxLines = 2, overflow = TextOverflow.Ellipsis) },
        secondaryLabel = if (details.isEmpty()) {
            null
        } else {
            { Text(details.joinToString(" · "), maxLines = 1, overflow = TextOverflow.Ellipsis) }
        },
    )
}

@Composable
private fun RunningTimerCard(timer: WatchSummary.RunningTimer, isBusy: Boolean, onStop: () -> Unit) {
    var now by remember { mutableStateOf(Instant.now()) }
    LaunchedEffect(timer.id) {
        while (true) {
            delay(1_000)
            now = Instant.now()
        }
    }
    val elapsed = Duration.between(timer.startTime, now).seconds
    val stopLabel = stringResource(R.string.timer_stop)

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(MaterialTheme.colors.surface, MaterialTheme.shapes.large)
            .padding(horizontal = 12.dp, vertical = 8.dp),
    ) {
        Text(
            stringResource(R.string.timer_running),
            style = MaterialTheme.typography.caption2,
            color = MaterialTheme.colors.onSurfaceVariant,
        )
        Text(timer.taskTitle, style = MaterialTheme.typography.title3, maxLines = 2, overflow = TextOverflow.Ellipsis)
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(formatElapsed(elapsed), style = MaterialTheme.typography.title2)
            Spacer(Modifier.weight(1f))
            Button(
                onClick = onStop,
                enabled = !isBusy,
                colors = ButtonDefaults.secondaryButtonColors(),
                modifier = Modifier
                    .size(ButtonDefaults.SmallButtonSize)
                    .semantics { contentDescription = stopLabel },
            ) {
                StopIcon()
            }
        }
    }
}

/** The core icon set has no stop glyph, so a filled square stands in. */
@Composable
fun StopIcon(color: Color = MaterialTheme.colors.onSurface) {
    Box(Modifier.size(10.dp).background(color))
}

/** Only priorities that need attention get a marker; the rest stay quiet. */
fun priorityColor(priority: String): Color? = when (priority) {
    "urgent" -> Color(0xFFEF4444)
    "high" -> Color(0xFFF97316)
    "medium" -> Color(0xFFEAB308)
    else -> null
}
