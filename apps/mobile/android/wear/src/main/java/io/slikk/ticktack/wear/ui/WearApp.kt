package io.slikk.ticktack.wear.ui

import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.wear.compose.material.MaterialTheme
import androidx.wear.compose.navigation.SwipeDismissableNavHost
import androidx.wear.compose.navigation.composable
import androidx.wear.compose.navigation.rememberSwipeDismissableNavController

private const val TASKS_ROUTE = "tasks"
private const val TASK_ROUTE = "task/{taskId}"

@Composable
fun WearApp(viewModel: SummaryViewModel = viewModel()) {
    val credentials by viewModel.credentials.collectAsStateWithLifecycle()

    MaterialTheme {
        if (credentials == null) {
            PairingScreen(viewModel)
        } else {
            val navController = rememberSwipeDismissableNavController()
            SwipeDismissableNavHost(navController = navController, startDestination = TASKS_ROUTE) {
                composable(TASKS_ROUTE) {
                    TaskListScreen(viewModel, onOpenTask = { task -> navController.navigate("task/${task.id}") })
                }
                composable(TASK_ROUTE) { entry ->
                    TaskDetailScreen(
                        viewModel,
                        taskId = entry.arguments?.getString("taskId").orEmpty(),
                        onClose = { navController.popBackStack() },
                    )
                }
            }
        }
    }
}
