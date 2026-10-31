package com.atomik.activity.data.network

import com.atomik.activity.data.network.dto.DailyHealthResponse
import com.atomik.activity.data.network.dto.HealthBatchRequest
import com.atomik.activity.data.network.dto.HealthBatchResponse
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Query

interface HealthApi {
    @POST("health/batch")
    suspend fun batch(@Body body: HealthBatchRequest): HealthBatchResponse

    @GET("health/daily")
    suspend fun daily(@Query("date") date: String): DailyHealthResponse
}
