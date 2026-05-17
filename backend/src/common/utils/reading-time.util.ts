export function calculateReadingTime(htmlContent: string): number {
  const text = htmlContent.replace(/<[^>]+>/g, '');
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const wpm = 200;
  return Math.max(1, Math.ceil(wordCount / wpm));
}
