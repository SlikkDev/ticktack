// Watchers to notify about one change: everyone watching, minus whoever made
// the change and anyone the existing notifications already reached.
export function watcherRecipients(
  watcherIds: readonly string[],
  excluded: ReadonlyArray<string | null | undefined>,
): string[] {
  const skip = new Set(excluded.filter(Boolean));
  return [...new Set(watcherIds)].filter((id) => !skip.has(id));
}
