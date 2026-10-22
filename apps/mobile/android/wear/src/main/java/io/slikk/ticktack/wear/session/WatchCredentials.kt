package io.slikk.ticktack.wear.session

/** What the phone hands over: where the API lives and how to authenticate. */
data class WatchCredentials(
    /** Base URL ending in `/api`, for example https://ticktack.slikk.io/api. */
    val apiBaseUrl: String,
    val token: String,
)
