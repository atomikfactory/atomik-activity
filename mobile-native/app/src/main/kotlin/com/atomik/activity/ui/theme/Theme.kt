package com.atomik.activity.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable

private val DarkColors = darkColorScheme(
    primary          = Accent,
    onPrimary        = TextPrimary,
    secondary        = TrackingGreen,
    background       = Background,
    surface          = Surface,
    surfaceVariant   = SurfaceVar,
    onBackground     = TextPrimary,
    onSurface        = TextPrimary,
    outline          = Border,
)

@Composable
fun AtomikTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = DarkColors,
        typography  = AtomikTypography,
        content     = content,
    )
}
