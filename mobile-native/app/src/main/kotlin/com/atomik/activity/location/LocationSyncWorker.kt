package com.atomik.activity.location

import android.content.Context
import androidx.work.Constraints
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.NetworkType
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import com.atomik.activity.AtomikApp
import com.atomik.activity.data.network.dto.BatchItem
import com.atomik.activity.data.network.dto.BatchRequest
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import java.util.concurrent.TimeUnit

class LocationSyncWorker(ctx: Context, params: WorkerParameters) : CoroutineWorker(ctx, params) {

    override suspend fun doWork(): Result {
        return try {
            uploadPending(applicationContext as AtomikApp)
            Result.success()
        } catch (e: Exception) {
            if (runAttemptCount < 5) Result.retry() else Result.failure()
        }
    }

    companion object {
        private const val CHUNK_SIZE = 500

        // Serializes uploads so the periodic worker, the one-shot worker and the
        // "Sync now" button never send the same buffered rows twice.
        private val uploadMutex = Mutex()

        /** Uploads every buffered point in chunks. Throws on network/server failure. */
        suspend fun uploadPending(app: AtomikApp) = uploadMutex.withLock {
            val dao = app.db.locationDao()
            while (true) {
                val rows = dao.getOldest(CHUNK_SIZE)
                if (rows.isEmpty()) break
                val response = app.trackingApi.batch(
                    BatchRequest(rows.map { r ->
                        BatchItem(r.latitude, r.longitude, r.accuracy, r.altitude, r.speed, r.heading, r.timestamp)
                    })
                )
                if (!response.success) error("Server rejected batch")
                dao.deleteByIds(rows.map { it.id })
                if (rows.size < CHUNK_SIZE) break
            }
        }

        fun schedule(context: Context) {
            WorkManager.getInstance(context).enqueueUniquePeriodicWork(
                "location_sync_periodic",
                ExistingPeriodicWorkPolicy.KEEP,
                PeriodicWorkRequestBuilder<LocationSyncWorker>(15, TimeUnit.MINUTES)
                    .setConstraints(
                        Constraints.Builder()
                            .setRequiredNetworkType(NetworkType.CONNECTED)
                            .setRequiresBatteryNotLow(true)
                            .build()
                    )
                    .build()
            )
        }
    }
}
