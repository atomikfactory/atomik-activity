package com.atomik.activity.health

import android.content.Context
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.util.Log
import com.atomik.activity.AtomikApp
import com.atomik.activity.data.db.entities.HealthStepsDailyEntity
import com.atomik.activity.data.prefs.AppPreferences
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import java.time.LocalDate

/**
 * Reads the device's hardware step counter (Sensor.TYPE_STEP_COUNTER).
 *
 * The sensor reports a cumulative step count since the last device boot, so we keep
 * a "baseline" reading at the start of each local day and report
 *   todaySteps = currentRaw - baseline
 *
 * When the day rolls over (event timestamp's local date != stored baselineDate),
 * we finalize yesterday's count into Room (`health_steps_daily` — same schema as the
 * old HC pipeline so the backend payload doesn't change) and start fresh.
 *
 * If the sensor value decreases between two readings, the device rebooted; we treat
 * the new value as the new baseline and carry forward today's total so far.
 */
class StepTracker(private val context: Context) : SensorEventListener {

    private val sensorManager = context.getSystemService(Context.SENSOR_SERVICE) as SensorManager
    private val stepSensor: Sensor? = sensorManager.getDefaultSensor(Sensor.TYPE_STEP_COUNTER)
    private val prefs = AppPreferences(context)
    private val app  = context.applicationContext as AtomikApp
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    val isAvailable: Boolean get() = stepSensor != null

    fun start() {
        val sensor = stepSensor ?: run {
            Log.w("AtomikSteps", "Device has no TYPE_STEP_COUNTER sensor")
            return
        }
        sensorManager.registerListener(this, sensor, SensorManager.SENSOR_DELAY_NORMAL)
        Log.d("AtomikSteps", "Step sensor listener registered")
    }

    fun stop() {
        sensorManager.unregisterListener(this)
        scope.cancel()
    }

    override fun onSensorChanged(event: SensorEvent) {
        if (event.sensor.type != Sensor.TYPE_STEP_COUNTER) return
        val raw = event.values[0].toLong()
        scope.launch { processReading(raw) }
    }

    override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {}

    /** Visible to ViewModel so it can do an immediate read for UI. */
    suspend fun currentTodaySteps(): Long = prefs.readStepState().todayCount

    private suspend fun processReading(raw: Long) {
        val today = LocalDate.now().toString()
        val state = prefs.readStepState()

        // First-ever reading on this install — establish today's baseline.
        if (state.baselineCount < 0L) {
            val fresh = AppPreferences.StepState(
                baselineCount = raw,
                baselineDate  = today,
                todayCount    = 0L,
                lastRaw       = raw,
            )
            prefs.writeStepState(fresh)
            return
        }

        // Day rollover — close out yesterday and start a fresh baseline.
        // The baseline is the last reading of yesterday (not this one), so the steps
        // that produced this first post-midnight event are counted for today.
        if (state.baselineDate != today) {
            finalizeDay(state.baselineDate, state.todayCount)
            val baseline = if (raw >= state.lastRaw) state.lastRaw else 0L  // 0 = rebooted overnight
            val rolled = AppPreferences.StepState(
                baselineCount = baseline,
                baselineDate  = today,
                todayCount    = raw - baseline,
                lastRaw       = raw,
            )
            prefs.writeStepState(rolled)
            return
        }

        // Reboot detection — sensor counters reset to 0 on reboot.
        // Carry forward todayCount and use the new raw as baseline.
        if (raw < state.lastRaw) {
            val rebooted = state.copy(baselineCount = raw - state.todayCount, lastRaw = raw)
            prefs.writeStepState(rebooted)
            return
        }

        // Normal case — accumulate.
        val newToday = raw - state.baselineCount
        prefs.writeStepState(state.copy(todayCount = newToday, lastRaw = raw))
    }

    private suspend fun finalizeDay(date: String, count: Long) {
        if (date.isEmpty() || count <= 0L) return
        app.db.healthDao().upsertSteps(
            HealthStepsDailyEntity(
                date   = date,
                steps  = count.toInt(),
                source = "device_sensor",
            )
        )
        Log.d("AtomikSteps", "Finalized $date: $count steps")
    }
}
