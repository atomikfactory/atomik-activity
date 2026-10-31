package com.atomik.activity.data.db.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.atomik.activity.data.db.entities.LocationBufferEntity

@Dao
interface LocationDao {

    @Insert(onConflict = OnConflictStrategy.IGNORE)
    suspend fun insert(point: LocationBufferEntity)

    @Query("SELECT * FROM location_buffer ORDER BY timestamp ASC LIMIT :limit")
    suspend fun getOldest(limit: Int): List<LocationBufferEntity>

    @Query("DELETE FROM location_buffer WHERE id IN (:ids)")
    suspend fun deleteByIds(ids: List<Int>)

    @Query("SELECT COUNT(*) FROM location_buffer")
    suspend fun count(): Int
}
