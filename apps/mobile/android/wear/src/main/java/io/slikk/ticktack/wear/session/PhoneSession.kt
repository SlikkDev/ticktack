package io.slikk.ticktack.wear.session

import android.content.Context
import com.google.android.gms.wearable.DataMapItem
import com.google.android.gms.wearable.Wearable
import kotlinx.coroutines.tasks.await

/** Fetches the session from the phone when the listener service missed it. */
object PhoneSession {
    /**
     * Reads the session item the phone last published, which the Data Layer
     * keeps even while the phone is away, and otherwise asks the phone to
     * publish it again. Returns true when a session was found right away.
     */
    suspend fun request(context: Context): Boolean {
        val items = Wearable.getDataClient(context).dataItems.await()
        var found = false
        try {
            for (item in items) {
                if (item.uri.path != DataLayerPaths.SESSION) continue
                val data = DataMapItem.fromDataItem(item).dataMap
                val apiBaseUrl = data.getString(DataLayerPaths.API_URL_KEY) ?: continue
                SessionStore.update(context, apiBaseUrl, data.getString(DataLayerPaths.TOKEN_KEY))
                found = true
            }
        } finally {
            items.release()
        }
        if (found) return true

        val nodes = Wearable.getNodeClient(context).connectedNodes.await()
        val messages = Wearable.getMessageClient(context)
        for (node in nodes) {
            messages.sendMessage(node.id, DataLayerPaths.REQUEST_SESSION, ByteArray(0)).await()
        }
        return false
    }
}
