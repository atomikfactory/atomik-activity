package com.atomik.activity

import android.app.Application
import android.content.Context
import com.atomik.activity.data.db.AppDatabase
import com.atomik.activity.data.network.ApiClient
import com.atomik.activity.data.network.HealthApi
import com.atomik.activity.data.network.TrackingApi
import com.atomik.activity.data.prefs.AppPreferences
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import kotlinx.coroutines.runBlocking
import org.osmdroid.config.Configuration
import java.io.File

class AtomikApp : Application() {

    val prefs by lazy { AppPreferences(this) }
    val db    by lazy { AppDatabase.getInstance(this) }

    @Volatile lateinit var trackingApi: TrackingApi
        private set
    @Volatile lateinit var healthApi: HealthApi
        private set
    private var apiUrl: String? = null

    private val appScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    override fun onCreate() {
        super.onCreate()

        // osmdroid MUST be configured before any MapView is constructed.
        // Without load() + a writable cache path, tile downloads silently fail
        // and the map renders as a blank background.
        val osm = Configuration.getInstance()
        osm.load(this, getSharedPreferences("osmdroid", Context.MODE_PRIVATE))
        // OSM's tile usage policy requires an identifying User-Agent; generic or
        // missing ones get blocked.
        osm.userAgentValue   = "AtomikActivity/${BuildConfig.VERSION_NAME} (Android; $packageName)"
        osm.osmdroidBasePath = File(cacheDir, "osmdroid").apply { mkdirs() }
        osm.osmdroidTileCache = File(cacheDir, "osmdroid/tiles").apply { mkdirs() }

        // Build API clients synchronously so they exist before any screen or worker
        // touches them (a quick one-off DataStore read), then rebuild on URL changes.
        initApis(runBlocking { prefs.backendUrlFlow.first() })
        appScope.launch {
            prefs.backendUrlFlow.collect { newUrl ->
                if (newUrl != apiUrl) initApis(newUrl)
            }
        }
    }

    private fun initApis(url: String) {
        apiUrl = url
        val retrofit = ApiClient.build(url)
        trackingApi = retrofit.create(TrackingApi::class.java)
        healthApi   = retrofit.create(HealthApi::class.java)
    }
}
