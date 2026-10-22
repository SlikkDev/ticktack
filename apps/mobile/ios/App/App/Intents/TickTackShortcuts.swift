import AppIntents

/// The phrases Siri, Spotlight and the Shortcuts app offer as soon as the app
/// is installed. `\(.applicationName)` is the localized app name, TickTack;
/// translations live in App/AppShortcuts.xcstrings.
@available(iOS 17.0, *)
struct TickTackShortcuts: AppShortcutsProvider {
    static var appShortcuts: [AppShortcut] {
        AppShortcut(
            intent: CreateTaskIntent(),
            phrases: [
                "Create a task in \(.applicationName)",
                "Add a task in \(.applicationName)",
                "Add a task to \(.applicationName)",
                "New \(.applicationName) task",
            ],
            shortTitle: "Create task",
            systemImageName: "plus.square"
        )
        AppShortcut(
            intent: WhatsNextIntent(),
            phrases: [
                "What's next in \(.applicationName)",
                "What's on my plate in \(.applicationName)",
                "Show my \(.applicationName) tasks",
                "What are my \(.applicationName) tasks",
            ],
            shortTitle: "What's next",
            systemImageName: "checklist"
        )
        AppShortcut(
            intent: StartTimerIntent(),
            phrases: [
                "Start a timer in \(.applicationName)",
                "Start tracking time in \(.applicationName)",
                "Start a \(.applicationName) timer",
            ],
            shortTitle: "Start timer",
            systemImageName: "play.circle"
        )
        AppShortcut(
            intent: StopTimerIntent(),
            phrases: [
                "Stop the timer in \(.applicationName)",
                "Stop tracking time in \(.applicationName)",
                "Stop my \(.applicationName) timer",
            ],
            shortTitle: "Stop timer",
            systemImageName: "stop.circle"
        )
    }

    static var shortcutTileColor: ShortcutTileColor = .navy
}
