package io.slikk.ticktack.wear.session

import com.google.android.gms.wearable.DataEvent
import com.google.android.gms.wearable.DataEventBuffer
import com.google.android.gms.wearable.DataMapItem
import com.google.android.gms.wearable.WearableListenerService

/**
 * Receives the session item the phone publishes. Play services starts the
 * service on demand, so a sign-in or sign-out on the phone reaches the watch
 * even while this app is closed.
 */
class SessionListenerService : WearableListenerService() {
    override fun onDataChanged(events: DataEventBuffer) {
        for (event in events) {
            if (event.type != DataEvent.TYPE_CHANGED) continue
            val item = event.dataItem
            if (item.uri.path != DataLayerPaths.SESSION) continue
            val data = DataMapItem.fromDataItem(item).dataMap
            val apiBaseUrl = data.getString(DataLayerPaths.API_URL_KEY) ?: continue
            SessionStore.update(this, apiBaseUrl, data.getString(DataLayerPaths.TOKEN_KEY))
        }
    }
}
