package com.atomik.activity.data.network

import com.atomik.activity.data.network.dto.BatchRequest
import com.atomik.activity.data.network.dto.BatchResponse
import com.atomik.activity.data.network.dto.DailyTrackingResponse
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Query

interface TrackingApi {
    @POST("tracking/batch")
    suspend fun batch(@Body body: BatchRequest): BatchResponse

    @GET("tracking/daily")
    suspend fun daily(
        @Query("date") date: String,
        // IANA zone id so the server returns the device's local day, not the UTC day.
        @Query("tz") tz: String,
    ): DailyTrackingResponse
}
