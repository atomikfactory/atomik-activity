package com.atomik.activity.ui.nav

import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.atomik.activity.ui.health.HealthScreen
import com.atomik.activity.ui.home.HomeScreen
import com.atomik.activity.ui.timeline.TimelineScreen

sealed class Screen(val route: String) {
    data object Home     : Screen("home")
    data object Timeline : Screen("timeline")
    data object Health   : Screen("health")
}

@Composable
fun AppNavHost(
    modifier: Modifier = Modifier,
    navController: NavHostController = rememberNavController(),
) {
    NavHost(
        navController    = navController,
        startDestination = Screen.Home.route,
        modifier         = modifier,
    ) {
        composable(Screen.Home.route) {
            HomeScreen(
                onNavigateToTimeline = { navController.navigate(Screen.Timeline.route) },
                onNavigateToHealth   = { navController.navigate(Screen.Health.route) },
            )
        }
        composable(Screen.Timeline.route) {
            TimelineScreen(onBack = { navController.popBackStack() })
        }
        composable(Screen.Health.route) {
            HealthScreen(onBack = { navController.popBackStack() })
        }
    }
}
