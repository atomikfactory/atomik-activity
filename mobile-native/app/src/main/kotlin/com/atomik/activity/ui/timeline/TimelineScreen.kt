package com.atomik.activity.ui.timeline

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.zIndex
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.atomik.activity.ui.home.HomeViewModel
import com.atomik.activity.ui.theme.StopRed
import com.atomik.activity.ui.theme.TextSecondary
import java.time.LocalDate

@Composable
fun TimelineScreen(
    onBack: () -> Unit,
    vm: HomeViewModel = viewModel(),
) {
    val state by vm.uiState.collectAsStateWithLifecycle()

    // Initial load on entry; date changes go through onDateChange -> vm.loadDate().
    LaunchedEffect(Unit) {
        vm.loadDate(state.selectedDate)
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .systemBarsPadding(),
    ) {
        Surface(
            tonalElevation = 4.dp,
            modifier       = Modifier.fillMaxWidth().zIndex(1f),
        ) {
            TimelineHeader(
                title        = "Timeline",
                selectedDate = state.selectedDate,
                onDateChange = { vm.loadDate(it) },
                onBack       = onBack,
            )
        }

        Box(modifier = Modifier.weight(1f)) {
            // Always render the map so tiles are loaded and user can pan while data is fetching.
            TimelineMap(
                points   = state.points,
                modifier = Modifier.fillMaxSize(),
            )

            // Loading overlay — semi-transparent so the map tiles are still visible.
            if (state.loading) {
                CircularProgressIndicator(modifier = Modifier.align(Alignment.Center))
            }

            // Error banner at the bottom — shows server/network errors with a retry button.
            state.pointsError?.let { err ->
                Surface(
                    color    = androidx.compose.ui.graphics.Color(0xCC1a1a1a),
                    modifier = Modifier
                        .fillMaxWidth()
                        .align(Alignment.BottomCenter),
                ) {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        modifier = Modifier.padding(12.dp),
                    ) {
                        Text(
                            text      = "Could not load points",
                            color     = StopRed,
                            fontSize  = 13.sp,
                            textAlign = TextAlign.Center,
                        )
                        Text(
                            text      = err.take(120),  // trim long stack traces
                            color     = TextSecondary,
                            fontSize  = 11.sp,
                            textAlign = TextAlign.Center,
                            modifier  = Modifier.padding(top = 2.dp, bottom = 8.dp),
                        )
                        Button(
                            onClick = { vm.loadDate(state.selectedDate) },
                            modifier = Modifier.height(36.dp),
                        ) {
                            Text("Retry", fontSize = 13.sp)
                        }
                    }
                }
            }

            // Empty-state label — only when the load succeeded but no points exist for the day.
            if (!state.loading && state.pointsError == null && state.points.isEmpty()) {
                Surface(
                    color    = androidx.compose.ui.graphics.Color(0xCC1a1a1a),
                    modifier = Modifier
                        .align(Alignment.BottomCenter)
                        .padding(bottom = 24.dp)
                        .padding(horizontal = 32.dp),
                    shape    = MaterialTheme.shapes.medium,
                ) {
                    Text(
                        text      = "No points recorded on ${state.selectedDate}",
                        color     = TextSecondary,
                        fontSize  = 13.sp,
                        textAlign = TextAlign.Center,
                        modifier  = Modifier.padding(horizontal = 16.dp, vertical = 10.dp),
                    )
                }
            }
        }
    }
}
