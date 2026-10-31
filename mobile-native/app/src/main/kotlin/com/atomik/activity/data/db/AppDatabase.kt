package com.atomik.activity.data.db

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.room.migration.Migration
import androidx.sqlite.db.SupportSQLiteDatabase
import com.atomik.activity.data.db.dao.HealthDao
import com.atomik.activity.data.db.dao.LocationDao
import com.atomik.activity.data.db.entities.HealthSleepSessionEntity
import com.atomik.activity.data.db.entities.HealthStepsDailyEntity
import com.atomik.activity.data.db.entities.LocationBufferEntity

@Database(
    entities = [
        LocationBufferEntity::class,
        HealthStepsDailyEntity::class,
        HealthSleepSessionEntity::class,
    ],
    version = 1,
    exportSchema = false,
)
abstract class AppDatabase : RoomDatabase() {
    abstract fun locationDao(): LocationDao
    abstract fun healthDao(): HealthDao

    companion object {
        @Volatile private var INSTANCE: AppDatabase? = null

        // Migration from the Expo app's initial SQLite file (user_version = 0, only
        // location_buffer exists) to v1 which adds the health tables.
        val MIGRATION_0_1 = object : Migration(0, 1) {
            override fun migrate(db: SupportSQLiteDatabase) {
                db.execSQL("""
                    CREATE TABLE IF NOT EXISTS health_steps_daily (
                        id      INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
                        date    TEXT NOT NULL,
                        steps   INTEGER NOT NULL,
                        source  TEXT,
                        synced  INTEGER NOT NULL DEFAULT 0
                    )
                """.trimIndent())
                db.execSQL(
                    "CREATE UNIQUE INDEX IF NOT EXISTS idx_hsd_date ON health_steps_daily(date)"
                )
                db.execSQL("""
                    CREATE TABLE IF NOT EXISTS health_sleep_sessions (
                        id           INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
                        external_id  TEXT NOT NULL,
                        start_time   TEXT NOT NULL,
                        end_time     TEXT NOT NULL,
                        duration_min INTEGER NOT NULL,
                        stages_json  TEXT,
                        source       TEXT,
                        synced       INTEGER NOT NULL DEFAULT 0
                    )
                """.trimIndent())
                db.execSQL(
                    "CREATE UNIQUE INDEX IF NOT EXISTS idx_hss_ext ON health_sleep_sessions(external_id)"
                )
            }
        }

        fun getInstance(context: Context): AppDatabase {
            return INSTANCE ?: synchronized(this) {
                INSTANCE ?: Room.databaseBuilder(
                    context.applicationContext,
                    AppDatabase::class.java,
                    // Same filename as the Expo app — existing rows survive the install.
                    "location-offline.db",
                )
                    .addMigrations(MIGRATION_0_1)
                    // If Room cannot find a matching migration (DB has a version Room doesn't
                    // know about), fall back to recreating the tables — this should NOT happen
                    // in practice but prevents a hard crash.
                    .fallbackToDestructiveMigrationOnDowngrade()
                    .build()
                    .also { INSTANCE = it }
            }
        }
    }
}
