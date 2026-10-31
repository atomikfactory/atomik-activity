package com.atomik.activity.ui.timeline

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.ChevronLeft
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.atomik.activity.ui.theme.TextDisabled
import com.atomik.activity.ui.theme.TextPrimary
import com.atomik.activity.ui.theme.TextSecondary
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.util.Locale

private val DISPLAY_FMT = DateTimeFormatter.ofPattern("EEE, MMM d yyyy", Locale.ENGLISH)

@Composable
fun TimelineHeader(
    title: String,
    selectedDate: LocalDate,
    onDateChange: (LocalDate) -> Unit,
    onBack: (() -> Unit)? = null,
    modifier: Modifier = Modifier,
) {
    var showCalendar by remember { mutableStateOf(false) }
    val today        = LocalDate.now()
    val isToday      = selectedDate >= today

    Column(modifier = modifier.fillMaxWidth()) {
        // Title row
        Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier          = Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 8.dp),
        ) {
            if (onBack != null) {
                IconButton(onClick = onBack, modifier = Modifier.size(32.dp)) {
                    Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back",
                        tint = TextPrimary)
                }
            } else {
                Spacer(Modifier.size(32.dp))
            }
            Text(
                text     = title,
                fontSize = 17.sp,
                fontWeight = FontWeight.SemiBold,
                color    = TextPrimary,
                modifier = Modifier.weight(1f).wrapContentWidth(),
            )
            Spacer(Modifier.size(32.dp))
        }

        // Date nav row
        Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier.fillMaxWidth().padding(horizontal = 4.dp, vertical = 2.dp),
        ) {
            IconButton(onClick = { onDateChange(selectedDate.minusDays(1)) }) {
                Icon(Icons.Default.ChevronLeft, contentDescription = "Previous day",
                    tint = TextPrimary, modifier = Modifier.size(32.dp))
            }
            TextButton(
                onClick  = { showCalendar = true },
                modifier = Modifier.weight(1f),
            ) {
                Text(
                    text     = selectedDate.format(DISPLAY_FMT),
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Medium,
                    color    = TextPrimary,
                )
            }
            IconButton(
                onClick  = { onDateChange(selectedDate.plusDays(1)) },
                enabled  = !isToday,
            ) {
                Icon(Icons.Default.ChevronRight, contentDescription = "Next day",
                    tint = if (isToday) TextDisabled else TextPrimary, modifier = Modifier.size(32.dp))
            }
        }
    }

    if (showCalendar) {
        CalendarSheet(
            selectedDate = selectedDate,
            maxDate      = today,
            onSelect     = { date -> onDateChange(date); showCalendar = false },
            onDismiss    = { showCalendar = false },
        )
    }
}
