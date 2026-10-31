package com.atomik.activity.data.network.dto

import kotlinx.serialization.Serializable

@Serializable
data class StepsBatchItem(val date: String, val steps: Int, val source: String?)

@Serializable
data class SleepStageItem(val stage: Int, val startTime: String, val endTime: String)

@Serializable
data class SleepBatchItem(
    val externalId: String,
    val startTime: String,
    val endTime: String,
    val durationMin: Int,
    val stages: List<SleepStageItem>?,
    val source: String?,
)

@Serializable
data class HealthBatchRequest(
    val steps: List<StepsBatchItem>,
    val sleep: List<SleepBatchItem>,
)

@Serializable
data class HealthBatchResponse(val success: Boolean, val stepsCount: Int, val sleepCount: Int)

@Serializable
data class DailyHealthResponse(
    val date: String,
    val steps: Int?,
    val stepsSource: String?,
    val sleep: SleepRecord?,
)

@Serializable
data class SleepRecord(
    val externalId: String?,
    val startTime: String,
    val endTime: String,
    val durationMin: Int,
    val stages: String?,   // raw JSON string from the C# backend's jsonb column
    val source: String?,
)
