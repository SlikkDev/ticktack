import Foundation

extension WatchSummary {
    /// Tasks that need attention today: due today or already overdue.
    func dueNow(now: Date = Date()) -> [TaskItem] {
        tasks.filter { task in
            let section = TaskSection.section(for: task.dueDate, now: now)
            return section == .today || section == .overdue
        }
    }
}
