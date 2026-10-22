package io.slikk.ticktack.wear

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import io.slikk.ticktack.wear.ui.WearApp

/**
 * Wear OS companion for the TickTack phone app.
 *
 * The phone publishes the API base URL and its bearer token over the Data
 * Layer (see WatchSessionRelay in ../app); from then on the watch talks to the
 * API directly.
 */
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent { WearApp() }
    }
}
