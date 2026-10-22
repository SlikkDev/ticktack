package io.slikk.ticktack.wear.ui

import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.wear.compose.foundation.lazy.ScalingLazyColumn
import androidx.wear.compose.foundation.lazy.rememberScalingLazyListState
import androidx.wear.compose.material.Chip
import androidx.wear.compose.material.ChipDefaults
import androidx.wear.compose.material.CircularProgressIndicator
import androidx.wear.compose.material.Icon
import androidx.wear.compose.material.MaterialTheme
import androidx.wear.compose.material.PositionIndicator
import androidx.wear.compose.material.Scaffold
import androidx.wear.compose.material.Text
import androidx.wear.compose.material.TimeText
import io.slikk.ticktack.wear.R

/** Shown until the phone has handed over a signed-in session. */
@Composable
fun PairingScreen(viewModel: SummaryViewModel) {
    val isRequesting by viewModel.isRequestingSession.collectAsStateWithLifecycle()
    val message by viewModel.pairingMessage.collectAsStateWithLifecycle()
    val listState = rememberScalingLazyListState()

    LaunchedEffect(Unit) { viewModel.requestSession() }

    Scaffold(
        timeText = { TimeText() },
        positionIndicator = { PositionIndicator(scalingLazyListState = listState) },
    ) {
        ScalingLazyColumn(
            state = listState,
            modifier = Modifier.fillMaxSize(),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            item {
                Text(
                    stringResource(R.string.pairing_title),
                    style = MaterialTheme.typography.title3,
                    textAlign = TextAlign.Center,
                )
            }
            item {
                Text(
                    stringResource(R.string.pairing_body),
                    style = MaterialTheme.typography.caption2,
                    textAlign = TextAlign.Center,
                )
            }
            message?.let { text ->
                item {
                    Text(
                        text,
                        style = MaterialTheme.typography.caption2,
                        color = MaterialTheme.colors.primary,
                        textAlign = TextAlign.Center,
                    )
                }
            }
            item {
                Chip(
                    onClick = viewModel::requestSession,
                    enabled = !isRequesting,
                    label = { Text(stringResource(R.string.pairing_retry)) },
                    icon = {
                        if (isRequesting) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(ChipDefaults.IconSize),
                                strokeWidth = 2.dp,
                            )
                        } else {
                            Icon(Icons.Filled.Refresh, contentDescription = null)
                        }
                    },
                )
            }
        }
    }
}
