package com.atomik.activity.data.db.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.atomik.activity.data.db.entities.HealthSleepSessionEntity
import com.atomik.activity.data.db.entities.HealthStepsDailyEntity

@Dao
interface HealthDao {

    // Steps
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertSteps(entity: HealthStepsDailyEntity)

    @Query("SELECT * FROM health_steps_daily WHERE synced = 0")
    suspend fun getUnsyncedSteps(): List<HealthStepsDailyEntity>

    @Query("UPDATE health_steps_daily SET synced = 1 WHERE id IN (:ids)")
    suspend fun markStepsSynced(ids: List<Int>)

    @Query("SELECT steps FROM health_steps_daily WHERE date = :date LIMIT 1")
    suspend fun getStepsForDate(date: String): Int?

    // Sleep
    @Insert(onConflict = OnConflictStrategy.IGNORE)
    suspend fun insertSleep(entity: HealthSleepSessionEntity)

    @Query("SELECT * FROM health_sleep_sessions WHERE synced = 0")
    suspend fun getUnsyncedSleep(): List<HealthSleepSessionEntity>

    @Query("UPDATE health_sleep_sessions SET synced = 1 WHERE id IN (:ids)")
    suspend fun markSleepSynced(ids: List<Int>)
}
