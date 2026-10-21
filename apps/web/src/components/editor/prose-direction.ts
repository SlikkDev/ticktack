// A container's dir=auto skips descendants that have their own direction.
// Resolve checklist text explicitly so its checkbox follows its first sentence.
export function proseDirection(text: string, fallback: "ltr" | "rtl") {
  const firstLetter = text.match(/\p{Letter}/u)?.[0];
  if (!firstLetter) return fallback;
  return /[\p{Script=Hebrew}\p{Script=Arabic}]/u.test(firstLetter)
    ? "rtl"
    : "ltr";
}
