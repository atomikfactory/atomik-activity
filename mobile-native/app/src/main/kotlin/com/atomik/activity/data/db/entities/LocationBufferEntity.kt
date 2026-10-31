package com.atomik.activity.data.db.entities

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.PrimaryKey

// Schema mirrors location_buffer created by the Expo app's offlineBuffer.ts.
// Column names and types MUST match exactly — Room validates the schema at runtime.
@Entity(tableName = "location_buffer")
data class LocationBufferEntity(
    @PrimaryKey(autoGenerate = true)
    @ColumnInfo(name = "id")    val id: Int = 0,
    @ColumnInfo(name = "latitude")  val latitude: Double,
    @ColumnInfo(name = "longitude") val longitude: Double,
    @ColumnInfo(name = "accuracy")  val accuracy: Double?,
    @ColumnInfo(name = "altitude")  val altitude: Double?,
    @ColumnInfo(name = "speed")     val speed: Double?,
    @ColumnInfo(name = "heading")   val heading: Double?,
    @ColumnInfo(name = "timestamp") val timestamp: Long,  // unix milliseconds
)
