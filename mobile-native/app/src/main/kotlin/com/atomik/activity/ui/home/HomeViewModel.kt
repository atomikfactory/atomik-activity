package com.atomik.activity.ui.home

import android.app.Application
import android.content.Intent
import androidx.core.content.ContextCompat
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.atomik.activity.AtomikApp
import com.atomik.activity.BuildConfig
import com.atomik.activity.data.network.dto.TrackingPoint
import com.atomik.activity.data.prefs.AppPreferences
import com.atomik.activity.location.LocationService
import com.atomik.activity.location.LocationSyncWorker
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.time.LocalDate
import java.time.ZoneId

data class HomeUiState(
    val selectedDate: LocalDate    = LocalDate.now(),
    val trackingEnabled: Boolean   = true,
    val points: List<TrackingPoint> = emptyList(),
    val loading: Boolean           = false,
    val pointsError: String?       = null,
    val pendingCount: Int          = 0,
    val syncing: Boolean           = false,
    val syncError: String?         = null,
    val serverUrl: String          = BuildConfig.BACKEND_URL,
    val error: String?             = null,
)

class HomeViewModel(app: Application) : AndroidViewModel(app) {

    private val atomikApp = app as AtomikApp
    private val prefs     = AppPreferences(app)

    private val _uiState = MutableStateFlow(HomeUiState())
    val uiState: StateFlow<HomeUiState> = _uiState

    init {
        viewModelScope.launch {
            prefs.trackingEnabledFlow.collect { enabled ->
                _uiState.update { it.copy(trackingEnabled = enabled) }
            }
        }
        viewModelScope.launch {
            prefs.backendUrlFlow.collect { url ->
                _uiState.update { it.copy(serverUrl = url) }
            }
        }
        refreshPendingCount()
        LocationSyncWorker.schedule(app)
    }

    fun refreshPendingCount() {
        viewModelScope.launch {
            val count = atomikApp.db.locationDao().count()
            _uiState.update { it.copy(pendingCount = count) }
        }
    }

    private var loadJob: Job? = null

    fun loadDate(date: LocalDate) {
        // Cancel any in-flight request so a slow response for a previous day can't
        // overwrite the day the user is now looking at.
        loadJob?.cancel()
        loadJob = viewModelScope.launch {
            _uiState.update { it.copy(loading = true, selectedDate = date, pointsError = null) }
            try {
                val res = atomikApp.trackingApi.daily(date.toString(), ZoneId.systemDefault().id)
                _uiState.update { it.copy(points = res.points, loading = false, pointsError = null) }
            } catch (e: kotlinx.coroutines.CancellationException) {
                throw e
            } catch (e: Exception) {
                val msg = e.message ?: "Unknown error"
                _uiState.update { it.copy(loading = false, points = emptyList(), pointsError = msg) }
            }
        }
    }

    fun syncNow() {
        viewModelScope.launch {
            _uiState.update { it.copy(syncing = true, syncError = null) }
            try {
                LocationSyncWorker.uploadPending(atomikApp)
                _uiState.update { it.copy(syncing = false, pendingCount = atomikApp.db.locationDao().count()) }
            } catch (e: Exception) {
                _uiState.update { it.copy(syncing = false, syncError = e.message) }
            }
        }
    }

    fun saveServerUrl(url: String) {
        viewModelScope.launch {
            prefs.setBackendUrl(url.trimEnd('/'))
        }
    }

    fun toggleTracking() {
        viewModelScope.launch {
            val enable = !_uiState.value.trackingEnabled
            prefs.setTrackingEnabled(enable)
            val intent = Intent(getApplication(), LocationService::class.java).also {
                it.action = if (enable) LocationService.ACTION_START else LocationService.ACTION_STOP
            }
            if (enable) {
                ContextCompat.startForegroundService(getApplication(), intent)
            } else {
                getApplication<Application>().startService(intent)
            }
        }
    }
}
