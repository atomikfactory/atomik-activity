package com.atomik.activity

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.core.content.ContextCompat
import androidx.lifecycle.lifecycleScope
import com.atomik.activity.location.LocationService
import com.atomik.activity.ui.nav.AppNavHost
import com.atomik.activity.ui.theme.AtomikTheme
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch

class MainActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            AtomikTheme {
                AppNavHost()
            }
        }

        // Auto-start the tracking service if the user has it enabled and
        // location permission is already granted. (PermissionGate handles
        // the runtime request flow; once granted, we kick the service.)
        lifecycleScope.launch {
            val app  = application as AtomikApp
            val want = app.prefs.trackingEnabledFlow.first()
            val ok   = ContextCompat.checkSelfPermission(
                this@MainActivity, Manifest.permission.ACCESS_FINE_LOCATION,
            ) == PackageManager.PERMISSION_GRANTED
            if (want && ok) {
                ContextCompat.startForegroundService(
                    this@MainActivity,
                    Intent(this@MainActivity, LocationService::class.java).apply {
                        action = LocationService.ACTION_START
                    },
                )
            }
        }
    }
}
