package com.atomik.activity.data.db.entities

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(
    tableName = "health_steps_daily",
    indices   = [Index(value = ["date"], unique = true)],
)
data class HealthStepsDailyEntity(
    @PrimaryKey(autoGenerate = true)
    @ColumnInfo(name = "id")     val id: Int = 0,
    @ColumnInfo(name = "date")   val date: String,
    @ColumnInfo(name = "steps")  val steps: Int,
    @ColumnInfo(name = "source") val source: String?,
    @ColumnInfo(name = "synced") val synced: Int = 0,
)
