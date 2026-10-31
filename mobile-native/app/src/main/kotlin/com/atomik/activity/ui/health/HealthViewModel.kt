package com.atomik.activity.ui.health

import android.app.Application
import android.hardware.Sensor
import android.hardware.SensorManager
import android.util.Log
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.atomik.activity.AtomikApp
import com.atomik.activity.data.db.entities.HealthStepsDailyEntity
import com.atomik.activity.data.network.dto.HealthBatchRequest
import com.atomik.activity.data.network.dto.StepsBatchItem
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.time.LocalDate

data class HealthUiState(
    val selectedDate: LocalDate = LocalDate.now(),
    val steps: Int? = null,
    val sensorAvailable: Boolean = true,
    val loading: Boolean = false,
    val source: String = "device_sensor",   // surfaces where the count came from
)

class HealthViewModel(app: Application) : AndroidViewModel(app) {

    private val atomikApp = app as AtomikApp

    private val _uiState = MutableStateFlow(HealthUiState())
    val uiState: StateFlow<HealthUiState> = _uiState

    init {
        // Probe the hardware once at init so the screen can show a "no sensor" state
        // if the user's device truly doesn't expose TYPE_STEP_COUNTER (older devices).
        val sm = app.getSystemService(Application.SENSOR_SERVICE) as SensorManager
        val sensor = sm.getDefaultSensor(Sensor.TYPE_STEP_COUNTER)
        Log.d("AtomikSteps", "Step counter sensor present: ${sensor != null}")
        _uiState.update { it.copy(sensorAvailable = sensor != null) }

        loadDate(LocalDate.now())
    }

    fun loadDate(date: LocalDate) = viewModelScope.launch {
        _uiState.update { it.copy(loading = true, selectedDate = date) }
        val today = LocalDate.now()
        val steps: Int? = if (date == today) {
            // Live count from prefs (updated by StepTracker as sensor events arrive)
            atomikApp.prefs.readStepState().todayCount.toInt()
        } else {
            // Historical day — read from Room (finalized at midnight by StepTracker)
            atomikApp.db.healthDao().getStepsForDate(date.toString())
        }
        _uiState.update { it.copy(steps = steps, loading = false) }

        if (date == today) {
            // StepTracker only writes to Room at midnight (day rollover), so today's count
            // lives only in DataStore.  Write it to Room now so syncToBackend() sends it.
            val todayCount = atomikApp.prefs.readStepState().todayCount
            if (todayCount > 0) {
                atomikApp.db.healthDao().upsertSteps(
                    HealthStepsDailyEntity(
                        date   = today.toString(),
                        steps  = todayCount.toInt(),
                        source = "device_sensor",
                    )
                )
            }
            syncToBackend()
        }
    }

    fun refresh() = loadDate(_uiState.value.selectedDate)

    private suspend fun syncToBackend() {
        try {
            val healthDao = atomikApp.db.healthDao()
            val stepsRows = healthDao.getUnsyncedSteps()
            if (stepsRows.isEmpty()) return

            val resp = atomikApp.healthApi.batch(
                HealthBatchRequest(
                    steps = stepsRows.map { StepsBatchItem(it.date, it.steps, it.source) },
                    sleep = emptyList(),
                )
            )
            if (resp.success) {
                healthDao.markStepsSynced(stepsRows.map { it.id })
            }
        } catch (e: Exception) {
            Log.w("AtomikSteps", "Sync failed", e)
        }
    }
}
