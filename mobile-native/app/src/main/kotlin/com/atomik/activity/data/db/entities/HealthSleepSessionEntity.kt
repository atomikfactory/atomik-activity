package com.atomik.activity.data.db.entities

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(
    tableName = "health_sleep_sessions",
    indices   = [Index(value = ["external_id"], unique = true)],
)
data class HealthSleepSessionEntity(
    @PrimaryKey(autoGenerate = true)
    @ColumnInfo(name = "id")           val id: Int = 0,
    @ColumnInfo(name = "external_id")  val externalId: String,
    @ColumnInfo(name = "start_time")   val startTime: String,
    @ColumnInfo(name = "end_time")     val endTime: String,
    @ColumnInfo(name = "duration_min") val durationMin: Int,
    @ColumnInfo(name = "stages_json")  val stagesJson: String?,
    @ColumnInfo(name = "source")       val source: String?,
    @ColumnInfo(name = "synced")       val synced: Int = 0,
)
