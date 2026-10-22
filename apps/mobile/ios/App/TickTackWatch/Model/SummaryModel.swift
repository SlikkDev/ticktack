import Combine
import Foundation
import WatchKit

/// Loads the summary and runs the quick actions, refreshing after each one so
/// the list reflects what the server accepted.
@MainActor
final class SummaryModel: ObservableObject {
    @Published private(set) var summary: WatchSummary = .empty
    @Published private(set) var isLoading = false
    @Published private(set) var hasLoaded = false
    @Published private(set) var busyTaskIds: Set<String> = []
    @Published var errorMessage: String?

    private let sessionStore: WatchSessionStore

    init(sessionStore: WatchSessionStore) {
        self.sessionStore = sessionStore
    }

    private var client: TickTackClient? {
        sessionStore.credentials.map { TickTackClient(credentials: $0) }
    }

    func refresh() async {
        guard let client else { return }
        isLoading = true
        defer { isLoading = false }
        do {
            summary = try await client.summary()
            hasLoaded = true
            errorMessage = nil
        } catch {
            handle(error)
        }
    }

    /// Moves the task; returns true when the server accepted it.
    @discardableResult
    func setStatus(_ status: WatchSummary.Status, for task: WatchSummary.TaskItem) async -> Bool {
        await perform(taskId: task.id) { client in
            try await client.updateStatus(taskId: task.id, status: status.slug)
        }
    }

    @discardableResult
    func startTimer(for task: WatchSummary.TaskItem) async -> Bool {
        await perform(taskId: task.id) { client in
            try await client.startTimer(taskId: task.id)
        }
    }

    @discardableResult
    func stopTimer() async -> Bool {
        guard let timer = summary.runningTimer else { return false }
        return await perform(taskId: timer.taskId) { client in
            try await client.stopTimer(timer)
        }
    }

    func isBusy(_ task: WatchSummary.TaskItem) -> Bool {
        busyTaskIds.contains(task.id)
    }

    private func perform(taskId: String, _ action: (TickTackClient) async throws -> Void) async -> Bool {
        guard let client else { return false }
        busyTaskIds.insert(taskId)
        defer { busyTaskIds.remove(taskId) }
        do {
            try await action(client)
            WKInterfaceDevice.current().play(.success)
            errorMessage = nil
        } catch {
            WKInterfaceDevice.current().play(.failure)
            handle(error)
            return false
        }
        await refresh()
        return true
    }

    private func handle(_ error: Error) {
        if case TickTackClientError.unauthorized = error {
            // The phone signed out or the session expired; the pairing screen
            // takes over and asks the phone for a fresh session.
            sessionStore.invalidate()
            return
        }
        errorMessage = error.localizedDescription
    }
}
