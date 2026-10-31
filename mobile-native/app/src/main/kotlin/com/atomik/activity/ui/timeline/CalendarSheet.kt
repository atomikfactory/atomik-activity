package com.atomik.activity.ui.timeline

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import java.time.LocalDate

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CalendarSheet(
    selectedDate: LocalDate,
    maxDate: LocalDate,
    onSelect: (LocalDate) -> Unit,
    onDismiss: () -> Unit,
) {
    val state = rememberDatePickerState(
        initialSelectedDateMillis = selectedDate.toEpochDay() * 86400_000L,
        selectableDates = object : SelectableDates {
            override fun isSelectableDate(utcTimeMillis: Long): Boolean {
                val d = LocalDate.ofEpochDay(utcTimeMillis / 86400_000L)
                return !d.isAfter(maxDate)
            }
        }
    )

    ModalBottomSheet(onDismissRequest = onDismiss) {
        DatePicker(
            state    = state,
            modifier = Modifier.padding(bottom = 16.dp),
        )
        Row(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp),
            horizontalArrangement = Arrangement.End,
        ) {
            TextButton(onClick = onDismiss) { Text("Cancel") }
            Spacer(Modifier.width(8.dp))
            Button(onClick = {
                state.selectedDateMillis?.let { ms ->
                    onSelect(LocalDate.ofEpochDay(ms / 86400_000L))
                }
            }) { Text("OK") }
        }
    }
}
