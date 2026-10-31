package com.atomik.activity.ui.health

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.zIndex
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.repeatOnLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.atomik.activity.ui.theme.Accent
import com.atomik.activity.ui.theme.Surface as SurfaceColor
import com.atomik.activity.ui.theme.TextPrimary
import com.atomik.activity.ui.theme.TextSecondary
import com.atomik.activity.ui.timeline.TimelineHeader

@Composable
fun HealthScreen(
    onBack: () -> Unit,
    vm: HealthViewModel = viewModel(),
) {
    val state    = vm.uiState.collectAsStateWithLifecycle().value
    val lifecycle = LocalLifecycleOwner.current.lifecycle

    // Re-read the prefs-backed count whenever the screen comes back to the foreground —
    // the StepTracker keeps updating in the background; we just refresh the UI here.
    LaunchedEffect(lifecycle) {
        lifecycle.repeatOnLifecycle(Lifecycle.State.RESUMED) {
            vm.refresh()
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .systemBarsPadding()
    ) {
        Surface(tonalElevation = 4.dp, modifier = Modifier.fillMaxWidth().zIndex(1f)) {
            TimelineHeader(
                title        = "Health",
                selectedDate = state.selectedDate,
                onDateChange = vm::loadDate,
                onBack       = onBack,
            )
        }

        Column(
            modifier = Modifier
                .weight(1f)
                .verticalScroll(rememberScrollState())
                .padding(top = 16.dp),
        ) {
            // Steps card
            Card(
                colors   = CardDefaults.cardColors(containerColor = SurfaceColor),
                modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp),
            ) {
                Column(modifier = Modifier.padding(20.dp).defaultMinSize(minHeight = 100.dp)) {
                    Text("STEPS", fontSize = 13.sp, color = TextSecondary, letterSpacing = 1.sp)
                    Spacer(Modifier.height(8.dp))

                    when {
                        !state.sensorAvailable ->
                            Text("No step counter sensor on this device",
                                color = TextSecondary, fontSize = 15.sp)
                        state.loading ->
                            CircularProgressIndicator(color = Accent, modifier = Modifier.size(28.dp))
                        state.steps == null || state.steps == 0 ->
                            Text("No steps recorded yet today",
                                color = TextSecondary, fontSize = 15.sp)
                        else ->
                            Text("%,d".format(state.steps),
                                fontSize = 52.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                    }

                    Spacer(Modifier.height(8.dp))
                    Text("from device step counter",
                        fontSize = 11.sp, color = TextSecondary)
                }
            }

            // Notes / placeholders
            Card(
                colors   = CardDefaults.cardColors(containerColor = SurfaceColor),
                modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp),
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text("SLEEP", fontSize = 13.sp, color = TextSecondary, letterSpacing = 1.sp)
                    Spacer(Modifier.height(8.dp))
                    Text(
                        "Sleep tracking is not available without a wearable or Health Connect — " +
                        "the phone alone cannot accurately detect sleep stages.",
                        color = TextSecondary, fontSize = 13.sp,
                    )
                }
            }

            // Refresh + diagnostic row
            Row(
                modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                OutlinedButton(
                    onClick  = vm::refresh,
                    modifier = Modifier.weight(1f),
                ) {
                    Text("Refresh")
                }
            }

            Text(
                "Step counter uses Android's TYPE_STEP_COUNTER sensor. " +
                "It updates while the background service is running, so steps are recorded " +
                "even when this screen is closed.",
                color    = TextSecondary,
                fontSize = 12.sp,
                modifier = Modifier.padding(16.dp),
                textAlign = androidx.compose.ui.text.style.TextAlign.Start,
            )
        }
    }
}
