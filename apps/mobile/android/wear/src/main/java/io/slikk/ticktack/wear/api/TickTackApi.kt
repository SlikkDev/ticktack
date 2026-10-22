package io.slikk.ticktack.wear.api

import io.slikk.ticktack.wear.session.WatchCredentials
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL
import java.time.Instant
import java.time.format.DateTimeFormatter
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject

/** The token was rejected; the phone must sign in again. */
class UnauthorizedException : IOException("Unauthorized")

class ApiException(val status: Int, message: String) : IOException(message)

/**
 * The handful of API calls the watch makes, authenticated with the bearer
 * token the phone handed over.
 */
class TickTackApi(private val credentials: WatchCredentials) {

    suspend fun summary(): WatchSummary =
        WatchSummary.parse(JSONObject(request("GET", "watch/summary")))

    /** Moves the task to another column of its project (`updateTaskStatus`). */
    suspend fun updateStatus(taskId: String, status: String) {
        request("PUT", "task/status/$taskId", JSONObject().put("status", status))
    }

    /** Starts an open-ended time entry on the task (`createTimeEntry`). */
    suspend fun startTimer(taskId: String) {
        request(
            "POST",
            "time-entry",
            JSONObject().put("taskId", taskId).put("startTime", timestamp(Instant.now())),
        )
    }

    /** Closes the running entry now (`updateTimeEntry`). */
    suspend fun stopTimer(timer: WatchSummary.RunningTimer) {
        request(
            "PUT",
            "time-entry/${timer.id}",
            JSONObject()
                .put("startTime", timestamp(timer.startTime))
                .put("endTime", timestamp(Instant.now())),
        )
    }

    private suspend fun request(method: String, path: String, body: JSONObject? = null): String =
        withContext(Dispatchers.IO) {
            val url = URL(credentials.apiBaseUrl.trimEnd('/') + "/" + path)
            val connection = url.openConnection() as HttpURLConnection
            try {
                connection.requestMethod = method
                connection.connectTimeout = 15_000
                connection.readTimeout = 30_000
                connection.setRequestProperty("Authorization", "Bearer ${credentials.token}")
                connection.setRequestProperty("Accept", "application/json")
                if (body != null) {
                    connection.doOutput = true
                    connection.setRequestProperty("Content-Type", "application/json")
                    connection.outputStream.use { it.write(body.toString().toByteArray(Charsets.UTF_8)) }
                }

                val status = connection.responseCode
                val stream = if (status in 200..299) connection.inputStream else connection.errorStream
                val text = stream?.bufferedReader(Charsets.UTF_8)?.use { it.readText() }.orEmpty()
                when {
                    status in 200..299 -> text
                    status == 401 -> throw UnauthorizedException()
                    else -> throw ApiException(status, errorMessage(text) ?: "HTTP $status")
                }
            } finally {
                connection.disconnect()
            }
        }

    private fun errorMessage(text: String): String? =
        runCatching { JSONObject(text).optString("message") }.getOrNull()?.takeIf { it.isNotBlank() }

    companion object {
        /** The API expects ISO 8601 timestamps. */
        fun timestamp(instant: Instant): String = DateTimeFormatter.ISO_INSTANT.format(instant)
    }
}
