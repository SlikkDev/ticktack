export function containsServerInternals(message: string): boolean {
  return (
    /<!doctype|<\/?(?:html|head|body|script)\b/i.test(message) ||
    /\n\s*at\s+\S+/.test(message) ||
    /\b(?:SQLSTATE|PrismaClient\w*Error|Sequelize\w*Error)\b/.test(message) ||
    /(?:error|exception):[\s\S]*\b(?:select|insert into|update|delete from)\b/i.test(
      message,
    )
  );
}
