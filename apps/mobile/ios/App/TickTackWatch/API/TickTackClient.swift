import Foundation

enum TickTackClientError: LocalizedError {
    /// The token was rejected; the phone must sign in again.
    case unauthorized
    case server(status: Int, message: String?)
    case unexpectedResponse

    var errorDescription: String? {
        switch self {
        case .unauthorized:
            return String(localized: "error.unauthorized")
        case .server(let status, let message):
            return message ?? String(localized: "error.server \(status)")
        case .unexpectedResponse:
            return String(localized: "error.unexpected")
        }
    }
}

/// The handful of API calls the watch makes, authenticated with the bearer
/// token the phone handed over. Paths are relative to the API base URL, for
/// example https://ticktack.slikk.io/api.
struct TickTackClient {
    let credentials: WatchCredentials
    var session: URLSession = .shared

    func summary() async throws -> WatchSummary {
        let data = try await send("GET", path: "watch/summary")
        do {
            return try Self.decoder.decode(WatchSummary.self, from: data)
        } catch {
            throw TickTackClientError.unexpectedResponse
        }
    }

    /// Moves the task to another column of its project (`updateTaskStatus`).
    func updateStatus(taskId: String, status: String) async throws {
        _ = try await send("PUT", path: "task/status/\(taskId)", body: ["status": status])
    }

    /// Starts an open-ended time entry on the task (`createTimeEntry`).
    func startTimer(taskId: String) async throws {
        _ = try await send(
            "POST",
            path: "time-entry",
            body: ["taskId": taskId, "startTime": Self.timestamp(Date())]
        )
    }

    /// Closes the running entry now (`updateTimeEntry`).
    func stopTimer(_ timer: WatchSummary.RunningTimer) async throws {
        _ = try await send(
            "PUT",
            path: "time-entry/\(timer.id)",
            body: [
                "startTime": Self.timestamp(timer.startTime),
                "endTime": Self.timestamp(Date()),
            ]
        )
    }

    private func send(_ method: String, path: String, body: [String: String]? = nil) async throws -> Data {
        var request = URLRequest(url: credentials.apiBaseURL.appendingPathComponent(path))
        request.httpMethod = method
        request.setValue("Bearer \(credentials.token)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        if let body {
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.httpBody = try JSONSerialization.data(withJSONObject: body)
        }

        let (data, response) = try await session.data(for: request)
        guard let http = response as? HTTPURLResponse else {
            throw TickTackClientError.unexpectedResponse
        }
        switch http.statusCode {
        case 200..<300:
            return data
        case 401:
            throw TickTackClientError.unauthorized
        default:
            let error = try? Self.decoder.decode(ApiError.self, from: data)
            throw TickTackClientError.server(status: http.statusCode, message: error?.message)
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
    static let decoder: JSONDecoder = {
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .custom { decoder in
            let container = try decoder.singleValueContainer()
            let raw = try container.decode(String.self)
            if let date = timestampFormatter.date(from: raw) ?? plainTimestampFormatter.date(from: raw) {
                return date
            }
            throw DecodingError.dataCorruptedError(in: container, debugDescription: "Not an ISO 8601 timestamp: \(raw)")
        }
        return decoder
    }()
}
