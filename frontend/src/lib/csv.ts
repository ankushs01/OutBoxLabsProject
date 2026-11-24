const EMAIL_RE = /[^\s,;"'<>]+@[^\s,;"'<>]+\.[^\s,;"'<>]+/g;
export const isEmail = (s: string) => /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/.test(s);

/** Extracts unique, valid-looking email addresses from any CSV / text content. */
export function extractEmails(text: string): string[] {
  const found = text.match(EMAIL_RE) ?? [];
  return [...new Set(found.map((e) => e.toLowerCase()))];
}
