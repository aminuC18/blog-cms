/** Strip HTML and estimate reading time (matches typical blog ~200 wpm). */
export function estimateReadingMinutes(html: string): number {
  const text = html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const words = text ? text.split(' ').length : 0;
  return Math.max(1, Math.ceil(words / 200));
}
