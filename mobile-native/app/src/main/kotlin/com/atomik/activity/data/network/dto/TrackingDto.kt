package com.atomik.activity.data.network.dto

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class BatchItem(
    val latitude: Double,
    val longitude: Double,
    val accuracy: Double?,
    val altitude: Double?,
    val speed: Double?,
    val heading: Double?,
    // unix milliseconds — C# BatchItem expects a long
    val timestamp: Long,
)

@Serializable
data class BatchRequest(val items: List<BatchItem>)

@Serializable
data class BatchResponse(val success: Boolean, val count: Int)

@Serializable
data class TrackingPoint(
    val id: String,
    val latitude: Double,
    val longitude: Double,
    val timestamp: String,
)

@Serializable
data class DailyTrackingResponse(
    val date: String,
    @SerialName("pointsCount") val pointsCount: Int,
    val points: List<TrackingPoint>,
)
