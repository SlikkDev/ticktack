import Foundation

/// Resolves spoken task names the same way as
/// apps/web/src/lib/assistant/match-task.ts, so Siri and the Android
/// assistant route agree on which task "the login bug" is.
enum AssistantMatching {
    /// Lower-cases, strips accents and punctuation and collapses whitespace.
    static func normalize(_ text: String) -> String {
        let folded = text.folding(
            options: [.caseInsensitive, .diacriticInsensitive, .widthInsensitive],
            locale: nil
        )
        var words: [String] = []
        var current = ""
        for scalar in folded.unicodeScalars {
            if CharacterSet.alphanumerics.contains(scalar) {
                current.unicodeScalars.append(scalar)
            } else if !current.isEmpty {
                words.append(current)
                current = ""
            }
        }
        if !current.isEmpty {
            words.append(current)
        }
        return words.joined(separator: " ")
    }

    /// The best matching tier: a ticket id such as "WEB-12", an exact title,
    /// a title that contains the words, and finally one that contains every
    /// word in any order. Input order is kept within a tier; the summary
    /// already sorts by due date. Several hits in a tier are all returned, so
    /// Siri asks instead of guessing.
    static func rank(
        _ tasks: [WatchSummary.TaskItem],
        query: String,
        projects: [WatchSummary.Project]
    ) -> [WatchSummary.TaskItem] {
        let needle = normalize(query)
        guard !needle.isEmpty else { return [] }

        let slugs = Dictionary(
            projects.map { ($0.id, normalize($0.slug)) },
            uniquingKeysWith: { first, _ in first }
        )
        let words = needle.split(separator: " ").map(String.init)
        let candidates = tasks.map { ($0, normalize($0.title)) }
        let tiers: [(WatchSummary.TaskItem, String) -> Bool] = [
            { task, _ in
                guard let number = task.number, let slug = slugs[task.projectId] else { return false }
                return needle == "\(slug) \(number)" || needle == "\(slug)\(number)"
            },
            { _, title in title == needle },
            { _, title in title.contains(needle) },
            { _, title in
                let own = Set(title.split(separator: " ").map(String.init))
                return words.allSatisfy { own.contains($0) }
            },
        ]

        for matches in tiers {
            let hits = candidates.filter { matches($0.0, $0.1) }.map { $0.0 }
            if !hits.isEmpty {
                return hits
            }
        }
        return []
    }
}
