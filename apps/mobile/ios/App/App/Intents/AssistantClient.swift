import Foundation

/// The API calls behind the Siri App Intents, authenticated with the bearer
/// token the web shell stored (NativeSessionStore). Paths are relative to the
/// API base URL, for example https://ticktack.slikk.io/api. Responses mirror
/// the Zod schemas in apps/api/src/*/response.ts; only the fields the intents
/// read are decoded.
@available(iOS 16.0, *)
struct AssistantClient {
    struct Workspace: Decodable {
        let id: String
        let name: String
    }

    struct Project: Decodable {
        let id: String
        let name: String
        let slug: String
        let workspaceId: String
    }

    struct Column: Decodable {
        let slug: String
        let isFinal: Bool
    }

    struct CreatedTask: Decodable {
        let id: String
        let number: Int?
    }

    let session: NativeSession
    var urlSession: URLSession = .shared

    /// Fails until the phone app has signed in once.
    static func signedIn() throws -> AssistantClient {
        guard let session = NativeSessionStore.current() else {
            throw AssistantError.notSignedIn
        }
        return AssistantClient(session: session)
    }

    /// `getWatchSummary`: the caller's open assigned tasks across every
    /// workspace, the projects they sit in and the running timer.
    func summary() async throws -> WatchSummary {
        try await decode(send("GET", path: "watch/summary"))
    }

    /// `listWorkspaces`, sorted by name.
    func workspaces() async throws -> [Workspace] {
        try await decode(send("GET", path: "workspace"))
    }

    /// `listProjects`: a workspace's active projects in sidebar order.
    func projects(workspaceId: String) async throws -> [Project] {
        try await decode(send(
            "GET",
            path: "project",
            query: [URLQueryItem(name: "workspaceId", value: workspaceId)]
        ))
    }

    /// `getColumns`, in board order.
    func columns(projectId: String) async throws -> [Column] {
        try await decode(send("GET", path: "column/\(projectId)"))
    }

    /// `createTask`, placed in the column named by `status`.
    func createTask(projectId: String, title: String, status: String) async throws -> CreatedTask {
        try await decode(send("POST", path: "task/\(projectId)", body: [
            "title": title,
            "description": "",
            "status": status,
            "priority": "no-priority",
        ]))
    }

    /// `createTimeEntry` without an end time: a running timer.
    func startTimer(taskId: String) async throws {
        _ = try await send("POST", path: "time-entry", body: [
            "taskId": taskId,
            "startTime": Self.timestamp(Date()),
        ])
    }

    /// `updateTimeEntry`: closes the running entry now.
    func stopTimer(_ timer: WatchSummary.RunningTimer) async throws {
        _ = try await send("PUT", path: "time-entry/\(timer.id)", body: [
            "startTime": Self.timestamp(timer.startTime),
            "endTime": Self.timestamp(Date()),
        ])
    }

    private func send(
        _ method: String,
        path: String,
        query: [URLQueryItem] = [],
        body: [String: String]? = nil
    ) async throws -> Data {
        var components = URLComponents(
            url: session.apiBaseURL.appendingPathComponent(path),
            resolvingAgainstBaseURL: false
        )
        if !query.isEmpty {
            components?.queryItems = query
        }
        guard let url = components?.url else {
            throw AssistantError.unexpectedResponse
        }

        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("Bearer \(session.token)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        if let body {
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.httpBody = try JSONSerialization.data(withJSONObject: body)
        }

        let (data, response) = try await urlSession.data(for: request)
        guard let http = response as? HTTPURLResponse else {
            throw AssistantError.unexpectedResponse
        }
        switch http.statusCode {
        case 200..<300:
            return data
        case 401:
            throw AssistantError.unauthorized
        default:
            let error = try? JSONDecoder().decode(ApiError.self, from: data)
            throw AssistantError.server(
                error?.message ?? HTTPURLResponse.localizedString(forStatusCode: http.statusCode)
            )
        }
    }

    private func decode<T: Decodable>(_ data: Data) throws -> T {
        do {
            return try Self.decoder.decode(T.self, from: data)
        } catch {
            throw AssistantError.unexpectedResponse
        }
    }

    private struct ApiError: Decodable {
        let message: String?
    }

    private static let timestampFormatter: ISO8601DateFormatter = {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter
    }()

    private static let plainTimestampFormatter: ISO8601DateFormatter = {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime]
        return formatter
    }()

    static func timestamp(_ date: Date) -> String {
        timestampFormatter.string(from: date)
    }

    /// The API serialises dates as ISO 8601 with milliseconds.
    private static let decoder: JSONDecoder = {
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .custom { decoder in
            let container = try decoder.singleValueContainer()
            let raw = try container.decode(String.self)
            if let date = timestampFormatter.date(from: raw) ?? plainTimestampFormatter.date(from: raw) {
                return date
            }
            throw DecodingError.dataCorruptedError(
                in: container,
                debugDescription: "Not an ISO 8601 timestamp: \(raw)"
            )
        }
        return decoder
    }()
}
