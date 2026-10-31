package com.atomik.activity.location

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import androidx.core.content.ContextCompat
import com.atomik.activity.data.prefs.AppPreferences
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch

class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Intent.ACTION_BOOT_COMPLETED) return
        CoroutineScope(Dispatchers.IO).launch {
            val prefs = AppPreferences(context)
            if (prefs.trackingEnabledFlow.first()) {
                ContextCompat.startForegroundService(
                    context,
                    Intent(context, LocationService::class.java).also {
                        it.action = LocationService.ACTION_START
                    }
                )
            }
        }
    }
}
