import Foundation
import WidgetKit

/// Builds the widget's timeline from `GET /api/watch/summary`, fetched with
/// the session the phone app stored (NativeSessionStore).
struct SummaryProvider: TimelineProvider {
    /// WidgetKit grants a few dozen refreshes a day. One every quarter hour
    /// keeps the due labels and the list current enough; the app asks for an
    /// immediate reload whenever it goes to the background, the session
    /// changes or a Siri intent changes a task.
    private static let refreshInterval: TimeInterval = 15 * 60
    /// A failed fetch, for example without network, is retried sooner.
    private static let retryInterval: TimeInterval = 5 * 60

    func placeholder(in context: Context) -> SummaryEntry {
        .sample
    }

    func getSnapshot(in context: Context, completion: @escaping (SummaryEntry) -> Void) {
        if context.isPreview {
            completion(.sample)
            return
        }
        Task { completion(await Self.load()) }
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<SummaryEntry>) -> Void) {
        Task {
            let entry = await Self.load()
            let interval: TimeInterval
            if case .unavailable = entry.state {
                interval = Self.retryInterval
            } else {
                interval = Self.refreshInterval
            }
            completion(Timeline(
                entries: [entry],
                policy: .after(entry.date.addingTimeInterval(interval))
            ))
        }
    }

    static func load(now: Date = Date()) async -> SummaryEntry {
        guard let session = NativeSessionStore.current() else {
            return SummaryEntry(date: now, state: .signedOut)
        }
        let links = WidgetLinks(clientURL: session.clientURL)
        do {
            let summary = try await AssistantClient(session: session).summary()
            return SummaryEntry(date: now, state: .loaded(summary), links: links)
        } catch AssistantError.unauthorized {
            // The session expired; the app signs in again and pushes a new token.
            return SummaryEntry(date: now, state: .signedOut, links: links)
        } catch {
            return SummaryEntry(date: now, state: .unavailable, links: links)
        }
    }
}
