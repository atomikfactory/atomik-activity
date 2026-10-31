package com.atomik.activity.data.prefs

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.atomik.activity.BuildConfig
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map

private val Context.dataStore: DataStore<Preferences> by preferencesDataStore("atomik_prefs")

class AppPreferences(private val context: Context) {

    companion object {
        private val KEY_BACKEND_URL          = stringPreferencesKey("backend_url")
        private val KEY_TRACKING_ENABLED     = booleanPreferencesKey("tracking_enabled")
        private val KEY_FIRST_LAUNCH         = booleanPreferencesKey("first_launch_done")
        // Step counter baseline — see StepTracker
        private val KEY_STEP_BASELINE_COUNT  = androidx.datastore.preferences.core.longPreferencesKey("step_baseline_count")
        private val KEY_STEP_BASELINE_DATE   = stringPreferencesKey("step_baseline_date")
        private val KEY_STEP_TODAY           = androidx.datastore.preferences.core.longPreferencesKey("step_today")
        private val KEY_STEP_LAST_RAW        = androidx.datastore.preferences.core.longPreferencesKey("step_last_raw")
    }

    val backendUrlFlow = context.dataStore.data.map {
        it[KEY_BACKEND_URL] ?: BuildConfig.BACKEND_URL
    }

    suspend fun getBackendUrl() = backendUrlFlow.first()

    suspend fun setBackendUrl(url: String) {
        context.dataStore.edit { it[KEY_BACKEND_URL] = url }
    }

    val trackingEnabledFlow = context.dataStore.data.map {
        it[KEY_TRACKING_ENABLED] ?: true  // auto-start tracking by default
    }

    suspend fun setTrackingEnabled(enabled: Boolean) {
        context.dataStore.edit { it[KEY_TRACKING_ENABLED] = enabled }
    }

    suspend fun isFirstLaunchDone() = context.dataStore.data.first()[KEY_FIRST_LAUNCH] ?: false

    suspend fun setFirstLaunchDone() {
        context.dataStore.edit { it[KEY_FIRST_LAUNCH] = true }
    }

    // Step counter state — accessed by StepTracker on every sensor event.
    data class StepState(
        val baselineCount: Long,   // raw sensor value when the day started
        val baselineDate:  String, // YYYY-MM-DD this baseline applies to
        val todayCount:    Long,   // computed steps for today (since baseline)
        val lastRaw:       Long,   // last raw sensor reading we processed (for reset detection)
    )

    suspend fun readStepState(): StepState {
        val p = context.dataStore.data.first()
        return StepState(
            baselineCount = p[KEY_STEP_BASELINE_COUNT] ?: -1L,
            baselineDate  = p[KEY_STEP_BASELINE_DATE]  ?: "",
            todayCount    = p[KEY_STEP_TODAY]          ?: 0L,
            lastRaw       = p[KEY_STEP_LAST_RAW]       ?: -1L,
        )
    }

    suspend fun writeStepState(s: StepState) {
        context.dataStore.edit {
            it[KEY_STEP_BASELINE_COUNT] = s.baselineCount
            it[KEY_STEP_BASELINE_DATE]  = s.baselineDate
            it[KEY_STEP_TODAY]          = s.todayCount
            it[KEY_STEP_LAST_RAW]       = s.lastRaw
        }
    }
}
