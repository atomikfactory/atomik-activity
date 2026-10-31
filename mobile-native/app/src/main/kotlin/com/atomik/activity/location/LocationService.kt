package com.atomik.activity.location

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Intent
import android.os.IBinder
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.app.ServiceCompat
import androidx.work.Constraints
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import com.atomik.activity.AtomikApp
import com.atomik.activity.R
import com.atomik.activity.data.db.entities.LocationBufferEntity
import com.atomik.activity.health.StepTracker
import com.google.android.gms.location.FusedLocationProviderClient
import com.google.android.gms.location.LocationCallback
import com.google.android.gms.location.LocationRequest
import com.google.android.gms.location.LocationResult
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch

class LocationService : Service() {

    companion object {
        const val ACTION_START = "com.atomik.activity.START_TRACKING"
        const val ACTION_STOP  = "com.atomik.activity.STOP_TRACKING"
        const val NOTIF_CHANNEL = "tracking"
        const val NOTIF_ID      = 1

        // Tracking parameters — tuned for visibility over battery.
        // Pixel devices handle this comfortably (typical drain <10% per day of active use).
        private const val UPDATE_INTERVAL_MS = 60_000L  // 1 min — frequent enough to see movement
        private const val MIN_DISTANCE_M     = 15f      // filter near-duplicates while standing still
        private const val SYNC_THRESHOLD     = 5        // upload every 5 points
    }

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private lateinit var fusedClient: FusedLocationProviderClient
    private var stepTracker: StepTracker? = null
    private var pointsSinceLastSync = 0

    private val locationCallback = object : LocationCallback() {
        override fun onLocationResult(result: LocationResult) {
            Log.d("AtomikLoc", "onLocationResult ${result.locations.size} fixes")
            result.locations.forEach { loc ->
                scope.launch {
                    val app = application as AtomikApp
                    app.db.locationDao().insert(
                        LocationBufferEntity(
                            latitude  = loc.latitude,
                            longitude = loc.longitude,
                            accuracy  = if (loc.hasAccuracy()) loc.accuracy.toDouble() else null,
                            altitude  = if (loc.hasAltitude()) loc.altitude else null,
                            speed     = if (loc.hasSpeed()) loc.speed.toDouble() else null,
                            heading   = if (loc.hasBearing()) loc.bearing.toDouble() else null,
                            timestamp = loc.time,
                        )
                    )
                    pointsSinceLastSync++
                    if (pointsSinceLastSync >= SYNC_THRESHOLD) {
                        pointsSinceLastSync = 0
                        enqueueSyncNow()
                    }
                }
            }
        }
    }

    override fun onCreate() {
        super.onCreate()
        fusedClient  = LocationServices.getFusedLocationProviderClient(this)
        stepTracker  = StepTracker(this)
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == ACTION_STOP) {
            stopTracking()
            stopForeground(STOP_FOREGROUND_REMOVE)
            stopSelf()
            return START_NOT_STICKY
        }

        // Promote to foreground BEFORE starting the location request — Android 14+ requirement.
        ServiceCompat.startForeground(
            this,
            NOTIF_ID,
            buildNotification(),
            android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION,
        )
        startTracking()
        return START_STICKY
    }

    private fun startTracking() {
        val request = LocationRequest.Builder(Priority.PRIORITY_BALANCED_POWER_ACCURACY, UPDATE_INTERVAL_MS)
            .setMinUpdateDistanceMeters(MIN_DISTANCE_M)
            .setMinUpdateIntervalMillis(UPDATE_INTERVAL_MS / 2)  // accept fixes as fast as 30s
            .setWaitForAccurateLocation(false)
            // No batching — deliver each fix as soon as it arrives.
            .build()

        try {
            fusedClient.requestLocationUpdates(request, locationCallback, mainLooper)
            Log.d("AtomikLoc", "Location updates requested (interval=${UPDATE_INTERVAL_MS}ms, dist=${MIN_DISTANCE_M}m)")
        } catch (e: SecurityException) {
            Log.e("AtomikLoc", "Missing location permission", e)
        }

        // Also start the hardware step counter — this is the user's "no Google" pedometer.
        stepTracker?.start()
    }

    private fun stopTracking() {
        fusedClient.removeLocationUpdates(locationCallback)
        stepTracker?.stop()
    }

    private fun enqueueSyncNow() {
        WorkManager.getInstance(applicationContext).enqueueUniqueWork(
            "location_sync_now",
            ExistingWorkPolicy.KEEP,
            OneTimeWorkRequestBuilder<LocationSyncWorker>()
                .setConstraints(Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build())
                .build(),
        )
    }

    private fun createNotificationChannel() {
        val mgr = getSystemService(NotificationManager::class.java)
        if (mgr.getNotificationChannel(NOTIF_CHANNEL) == null) {
            mgr.createNotificationChannel(
                NotificationChannel(NOTIF_CHANNEL, "Location tracking", NotificationManager.IMPORTANCE_LOW)
                    .also { it.setShowBadge(false) }
            )
        }
    }

    private fun buildNotification(): Notification =
        NotificationCompat.Builder(this, NOTIF_CHANNEL)
            .setContentTitle("atomik activity")
            .setContentText("Tracking active")
            .setSmallIcon(R.drawable.ic_tracking)
            .setOngoing(true)
            .setSilent(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onDestroy() {
        stopTracking()
        scope.cancel()
        super.onDestroy()
    }
}
