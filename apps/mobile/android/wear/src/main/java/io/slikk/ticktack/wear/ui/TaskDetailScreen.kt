package io.slikk.ticktack.wear.ui

import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.wear.compose.foundation.lazy.ScalingLazyColumn
import androidx.wear.compose.foundation.lazy.items
import androidx.wear.compose.foundation.lazy.rememberScalingLazyListState
import androidx.wear.compose.material.Chip
import androidx.wear.compose.material.ChipDefaults
import androidx.wear.compose.material.Icon
import androidx.wear.compose.material.MaterialTheme
import androidx.wear.compose.material.PositionIndicator
import androidx.wear.compose.material.Scaffold
import androidx.wear.compose.material.Text
import androidx.wear.compose.material.TimeText
import io.slikk.ticktack.wear.R

@Composable
fun TaskDetailScreen(viewModel: SummaryViewModel, taskId: String, onClose: () -> Unit) {
    val summary by viewModel.summary.collectAsStateWithLifecycle()
    val busyTaskIds by viewModel.busyTaskIds.collectAsStateWithLifecycle()
    val errorMessage by viewModel.errorMessage.collectAsStateWithLifecycle()
    val task = summary.task(taskId)

    if (task == null) {
        // Completed, reassigned, or gone: nothing left to act on here.
        LaunchedEffect(taskId) { onClose() }
        return
    }

    val project = summary.project(task)
    val isBusy = task.id in busyTaskIds
    val timerRunsHere = summary.runningTimer?.taskId == task.id
    var showStatuses by remember { mutableStateOf(false) }
    val listState = rememberScalingLazyListState()

    Scaffold(
        timeText = { TimeText() },
        positionIndicator = { PositionIndicator(scalingLazyListState = listState) },
    ) {
        ScalingLazyColumn(state = listState, modifier = Modifier.fillMaxSize()) {
            item { Text(task.title, style = MaterialTheme.typography.title3, textAlign = TextAlign.Center) }
            if (project != null) {
                item {
                    Text(
                        "${project.name} · ${project.workspaceName}",
                        style = MaterialTheme.typography.caption2,
                        color = MaterialTheme.colors.onSurfaceVariant,
                        textAlign = TextAlign.Center,
                    )
                }
            }
            task.statusName?.let { statusName ->
                item { DetailLine(stringResource(R.string.task_status), statusName) }
            }
            task.dueDate?.let { dueDate ->
                item { DetailLine(stringResource(R.string.task_due), longDueDateLabel(dueDate)) }
            }
            errorMessage?.let { message ->
                item {
                    Text(
                        message,
                        color = MaterialTheme.colors.error,
                        style = MaterialTheme.typography.caption2,
                        textAlign = TextAlign.Center,
                    )
                }
            }

            val finalStatus = project?.finalStatus
            if (finalStatus != null && finalStatus.slug != task.status) {
                item {
                    Chip(
                        onClick = { viewModel.setStatus(task, finalStatus) { accepted -> if (accepted) onClose() } },
                        enabled = !isBusy,
                        modifier = Modifier.fillMaxWidth(),
                        colors = ChipDefaults.primaryChipColors(),
                        icon = { Icon(Icons.Filled.Check, contentDescription = null) },
                        label = { Text(stringResource(R.string.task_complete)) },
                    )
                }
            }

            if (project != null && project.statuses.size > 1) {
                item {
                    Chip(
                        onClick = { showStatuses = !showStatuses },
                        enabled = !isBusy,
                        modifier = Modifier.fillMaxWidth(),
                        colors = ChipDefaults.secondaryChipColors(),
                        icon = { Icon(Icons.AutoMirrored.Filled.ArrowForward, contentDescription = null) },
                        label = { Text(stringResource(R.string.task_change_status)) },
                    )
                }
                if (showStatuses) {
                    items(project.statuses, key = { "status-${it.slug}" }) { status ->
                        val isCurrent = status.slug == task.status
                        val checkIcon: (@Composable BoxScope.() -> Unit)? = if (isCurrent) {
                            { Icon(Icons.Filled.Check, contentDescription = null) }
                        } else {
                            null
                        }
                        Chip(
                            onClick = {
                                showStatuses = false
                                viewModel.setStatus(task, status) { accepted ->
                                    if (accepted && status.isFinal) onClose()
                                }
                            },
                            enabled = !isBusy && !isCurrent,
                            modifier = Modifier.fillMaxWidth().padding(start = 12.dp),
                            colors = ChipDefaults.childChipColors(),
                            icon = checkIcon,
                            label = { Text(status.name) },
                        )
                    }
                }
            }

            item {
                Chip(
                    onClick = { if (timerRunsHere) viewModel.stopTimer() else viewModel.startTimer(task) },
                    enabled = !isBusy,
                    modifier = Modifier.fillMaxWidth(),
                    colors = ChipDefaults.secondaryChipColors(),
                    icon = {
                        if (timerRunsHere) StopIcon() else Icon(Icons.Filled.PlayArrow, contentDescription = null)
                    },
                    label = {
                        Text(stringResource(if (timerRunsHere) R.string.timer_stop else R.string.timer_start))
                    },
                )
            }
        }
    }
}

@Composable
private fun DetailLine(label: String, value: String) {
    Row(modifier = Modifier.fillMaxWidth()) {
        Text(label, style = MaterialTheme.typography.caption2, color = MaterialTheme.colors.onSurfaceVariant)
        Spacer(Modifier.width(6.dp))
        Text(value, style = MaterialTheme.typography.caption2)
    }
}
