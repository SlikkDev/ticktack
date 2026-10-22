package io.slikk.ticktack.wear.ui

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import io.slikk.ticktack.wear.R
import io.slikk.ticktack.wear.api.TickTackApi
import io.slikk.ticktack.wear.api.UnauthorizedException
import io.slikk.ticktack.wear.api.WatchSummary
import io.slikk.ticktack.wear.session.PhoneSession
import io.slikk.ticktack.wear.session.SessionStore
import io.slikk.ticktack.wear.session.WatchCredentials
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

/**
 * Loads the summary and runs the quick actions, refreshing after each one so
 * the list reflects what the server accepted.
 */
class SummaryViewModel(application: Application) : AndroidViewModel(application) {
    val credentials: StateFlow<WatchCredentials?> = SessionStore.credentials(application)

    private val _summary = MutableStateFlow(WatchSummary.EMPTY)
    val summary: StateFlow<WatchSummary> = _summary.asStateFlow()

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    private val _hasLoaded = MutableStateFlow(false)
    val hasLoaded: StateFlow<Boolean> = _hasLoaded.asStateFlow()

    private val _errorMessage = MutableStateFlow<String?>(null)
    val errorMessage: StateFlow<String?> = _errorMessage.asStateFlow()

    private val _busyTaskIds = MutableStateFlow<Set<String>>(emptySet())
    val busyTaskIds: StateFlow<Set<String>> = _busyTaskIds.asStateFlow()

    private val _isRequestingSession = MutableStateFlow(false)
    val isRequestingSession: StateFlow<Boolean> = _isRequestingSession.asStateFlow()

    private val _pairingMessage = MutableStateFlow<String?>(null)
    val pairingMessage: StateFlow<String?> = _pairingMessage.asStateFlow()

    private val api: TickTackApi?
        get() = credentials.value?.let { TickTackApi(it) }

    fun refresh() {
        val client = api ?: return
        viewModelScope.launch { load(client) }
    }

    /** Moves the task; reports whether the server accepted it. */
    fun setStatus(
        task: WatchSummary.TaskItem,
        status: WatchSummary.Status,
        onResult: (Boolean) -> Unit = {},
    ) = perform(task.id, onResult) { it.updateStatus(task.id, status.slug) }

    fun startTimer(task: WatchSummary.TaskItem) = perform(task.id) { it.startTimer(task.id) }

    fun stopTimer() {
        val timer = _summary.value.runningTimer ?: return
        perform(timer.taskId) { it.stopTimer(timer) }
    }

    /** Asks the phone for the session; see [PhoneSession]. */
    fun requestSession() {
        if (_isRequestingSession.value) return
        viewModelScope.launch {
            _isRequestingSession.value = true
            try {
                val found = PhoneSession.request(getApplication())
                _pairingMessage.value = if (found) null else string(R.string.pairing_requested)
            } catch (error: CancellationException) {
                throw error
            } catch (error: Exception) {
                _pairingMessage.value = string(R.string.pairing_phone_unreachable)
            } finally {
                _isRequestingSession.value = false
            }
        }
    }

    private suspend fun load(client: TickTackApi) {
        _isLoading.value = true
        try {
            _summary.value = client.summary()
            _hasLoaded.value = true
            _errorMessage.value = null
        } catch (error: CancellationException) {
            throw error
        } catch (error: Exception) {
            handle(error)
        } finally {
            _isLoading.value = false
        }
    }

    private fun perform(
        taskId: String,
        onResult: (Boolean) -> Unit = {},
        action: suspend (TickTackApi) -> Unit,
    ) {
        val client = api ?: return
        viewModelScope.launch {
            _busyTaskIds.update { it + taskId }
            val succeeded = try {
                action(client)
                _errorMessage.value = null
                true
            } catch (error: CancellationException) {
                throw error
            } catch (error: Exception) {
                handle(error)
                false
            } finally {
                _busyTaskIds.update { it - taskId }
            }
            if (succeeded) load(client)
            onResult(succeeded)
        }
    }

    private fun handle(error: Exception) {
        if (error is UnauthorizedException) {
            // The phone signed out or the session expired; the pairing screen
            // takes over and asks the phone for a fresh session.
            SessionStore.invalidate(getApplication())
            return
        }
        _errorMessage.value = error.message?.takeIf { it.isNotBlank() } ?: string(R.string.error_unexpected)
    }

    private fun string(id: Int): String = getApplication<Application>().getString(id)
}
