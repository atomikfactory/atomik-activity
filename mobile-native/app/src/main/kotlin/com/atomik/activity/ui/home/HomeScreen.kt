package com.atomik.activity.ui.home

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Map
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.Sync
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.atomik.activity.ui.permissions.PermissionGate
import com.atomik.activity.ui.theme.*

@Composable
fun HomeScreen(
    onNavigateToTimeline: () -> Unit,
    onNavigateToHealth: () -> Unit,
    vm: HomeViewModel = viewModel(),
) {
    val state by vm.uiState.collectAsStateWithLifecycle()
    var showServerDialog by remember { mutableStateOf(false) }

    PermissionGate {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .systemBarsPadding()
                .padding(horizontal = 20.dp),
            verticalArrangement = Arrangement.Center,
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {

            // App title
            Text(
                "atomik activity",
                fontSize   = 32.sp,
                fontWeight = FontWeight.Bold,
                color      = TextPrimary,
            )
            Text(
                "Privacy-first · Battery-optimized",
                fontSize = 14.sp,
                color    = TextSecondary,
                modifier = Modifier.padding(top = 4.dp, bottom = 32.dp),
            )

            // Status card
            Card(
                colors   = CardDefaults.cardColors(containerColor = Surface),
                modifier = Modifier.fillMaxWidth().padding(bottom = 20.dp),
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier          = Modifier.padding(16.dp),
                ) {
                    Text(
                        text  = if (state.trackingEnabled) "●" else "○",
                        color = if (state.trackingEnabled) TrackingGreen else TextSecondary,
                        fontSize = 20.sp,
                        modifier = Modifier.padding(end = 12.dp),
                    )
                    Column {
                        Text(
                            text       = if (state.trackingEnabled) "Tracking active" else "Tracking stopped",
                            color      = TextPrimary,
                            fontWeight = FontWeight.SemiBold,
                            fontSize   = 16.sp,
                        )
                        if (state.pendingCount > 0) {
                            Text(
                                "${state.pendingCount} points pending upload",
                                color    = TextSecondary,
                                fontSize = 13.sp,
                            )
                        }
                    }
                }
            }

            // Track toggle
            Button(
                onClick  = vm::toggleTracking,
                colors   = ButtonDefaults.buttonColors(
                    containerColor = if (state.trackingEnabled) StopRed else Accent,
                ),
                modifier = Modifier.fillMaxWidth().padding(bottom = 12.dp),
            ) {
                Text(
                    if (state.trackingEnabled) "⏹  Stop Tracking" else "▶  Start Tracking",
                    fontWeight = FontWeight.SemiBold,
                )
            }

            // View timeline map
            OutlinedButton(
                onClick  = onNavigateToTimeline,
                modifier = Modifier.fillMaxWidth().padding(bottom = 12.dp),
            ) {
                Icon(Icons.Default.Map, contentDescription = null, modifier = Modifier.padding(end = 8.dp))
                Text("View Timeline Map")
            }

            // Sync now
            OutlinedButton(
                onClick  = { vm.syncNow(); vm.refreshPendingCount() },
                enabled  = !state.syncing && state.pendingCount > 0,
                modifier = Modifier.fillMaxWidth().padding(bottom = 12.dp),
            ) {
                if (state.syncing) {
                    CircularProgressIndicator(modifier = Modifier.size(16.dp).padding(end = 8.dp))
                } else {
                    Icon(Icons.Default.Sync, contentDescription = null, modifier = Modifier.padding(end = 8.dp))
                }
                Text(
                    if (state.pendingCount > 0) "Sync now (${state.pendingCount})" else "All synced",
                )
            }

            // Health shortcut
            OutlinedButton(
                onClick  = onNavigateToHealth,
                modifier = Modifier.fillMaxWidth().padding(bottom = 24.dp),
            ) {
                Text("♥  Health")
            }

            // Server settings
            TextButton(onClick = { showServerDialog = true }) {
                Icon(Icons.Default.Settings, contentDescription = null,
                    tint = TextSecondary, modifier = Modifier.padding(end = 6.dp))
                Text("Server Settings", color = TextSecondary)
            }

            state.syncError?.let {
                Text("Sync error: $it", color = StopRed, fontSize = 12.sp, modifier = Modifier.padding(top = 8.dp))
            }
        }
    }

    if (showServerDialog) {
        ServerSettingsDialog(
            currentUrl = state.serverUrl,
            onSave     = { url -> vm.saveServerUrl(url); showServerDialog = false },
            onDismiss  = { showServerDialog = false },
        )
    }
}

@Composable
private fun ServerSettingsDialog(
    currentUrl: String,
    onSave: (String) -> Unit,
    onDismiss: () -> Unit,
) {
    var url by remember { mutableStateOf(currentUrl) }
    AlertDialog(
        onDismissRequest = onDismiss,
        title  = { Text("Server Settings") },
        text   = {
            Column {
                Text("Backend URL", fontSize = 13.sp, color = TextSecondary)
                Spacer(Modifier.height(8.dp))
                OutlinedTextField(
                    value         = url,
                    onValueChange = { url = it },
                    singleLine    = true,
                    placeholder   = { Text("http://<server-ip>:3000/api") },
                )
                Text("Pixel → Windows: use your machine's LAN IP",
                    fontSize = 11.sp, color = TextSecondary, modifier = Modifier.padding(top = 4.dp))
            }
        },
        confirmButton = { TextButton(onClick = { onSave(url) }) { Text("Save") } },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } },
    )
}
