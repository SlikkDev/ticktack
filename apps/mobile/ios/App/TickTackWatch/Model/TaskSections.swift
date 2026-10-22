import Foundation

enum TaskSection: CaseIterable, Identifiable {
    case overdue
    case today
    case upcoming
    case undated

    var id: Self { self }

    var title: String {
        switch self {
        case .overdue: return String(localized: "section.overdue")
        case .today: return String(localized: "section.today")
        case .upcoming: return String(localized: "section.upcoming")
        case .undated: return String(localized: "section.undated")
        }
    }

    /// Where a task belongs relative to the wearer's calendar day.
    static func section(for dueDate: Date?, now: Date = Date(), calendar: Calendar = .current) -> TaskSection {
        guard let dueDate else { return .undated }
        if calendar.isDate(dueDate, inSameDayAs: now) { return .today }
        return dueDate < now ? .overdue : .upcoming
    }
}

struct TaskGroup: Identifiable {
    let section: TaskSection
    let tasks: [WatchSummary.TaskItem]

    var id: TaskSection { section }
}

enum TaskSections {
    /// Keeps the server's order (soonest due, then priority) inside each group
    /// and drops empty groups.
    static func group(_ tasks: [WatchSummary.TaskItem], now: Date = Date(), calendar: Calendar = .current) -> [TaskGroup] {
        TaskSection.allCases.compactMap { section in
            let members = tasks.filter {
                TaskSection.section(for: $0.dueDate, now: now, calendar: calendar) == section
            }
            return members.isEmpty ? nil : TaskGroup(section: section, tasks: members)
        }
    }
}

enum DueDateFormat {
    static func short(_ date: Date, now: Date = Date(), calendar: Calendar = .current) -> String {
        if calendar.isDate(date, inSameDayAs: now) { return String(localized: "due.today") }
        if let tomorrow = calendar.date(byAdding: .day, value: 1, to: now),
           calendar.isDate(date, inSameDayAs: tomorrow) {
            return String(localized: "due.tomorrow")
        }
        if let yesterday = calendar.date(byAdding: .day, value: -1, to: now),
           calendar.isDate(date, inSameDayAs: yesterday) {
            return String(localized: "due.yesterday")
        }
        return date.formatted(.dateTime.day().month(.abbreviated))
    }

    static func long(_ date: Date) -> String {
        date.formatted(.dateTime.weekday(.abbreviated).day().month(.abbreviated))
    }
}
