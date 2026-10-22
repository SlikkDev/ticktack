package io.slikk.ticktack.wear.session

import android.content.Context
import android.content.SharedPreferences
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

/**
 * Keeps the session the phone handed over, across launches, and exposes it to
 * the UI. A process-wide object because the Data Layer listener service and
 * the activity both touch it.
 */
object SessionStore {
    private const val PREFERENCES = "io.slikk.ticktack.watch"
    private const val API_URL_KEY = "apiUrl"
    private const val TOKEN_KEY = "token"

    private val state = MutableStateFlow<WatchCredentials?>(null)
    private var loaded = false

    fun credentials(context: Context): StateFlow<WatchCredentials?> {
        ensureLoaded(context)
        return state.asStateFlow()
    }

    /** Stores what the phone sent. A missing token signs the watch out. */
    fun update(context: Context, apiBaseUrl: String, token: String?) {
        synchronized(this) {
            preferences(context).edit().apply {
                putString(API_URL_KEY, apiBaseUrl)
                if (token.isNullOrEmpty()) remove(TOKEN_KEY) else putString(TOKEN_KEY, token)
            }.apply()
            loaded = true
            state.value = if (token.isNullOrEmpty()) null else WatchCredentials(apiBaseUrl, token)
        }
    }

    /** The API rejected the token: the phone signed out or the session expired. */
    fun invalidate(context: Context) {
        synchronized(this) {
            preferences(context).edit().remove(TOKEN_KEY).apply()
            state.value = null
        }
    }

    private fun ensureLoaded(context: Context) {
        synchronized(this) {
            if (loaded) return
            loaded = true
            state.value = read(preferences(context))
        }
    }

    private fun read(preferences: SharedPreferences): WatchCredentials? {
        val apiBaseUrl = preferences.getString(API_URL_KEY, null) ?: return null
        val token = preferences.getString(TOKEN_KEY, null) ?: return null
        return WatchCredentials(apiBaseUrl, token)
    }

    private fun preferences(context: Context): SharedPreferences =
        context.applicationContext.getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE)
}
