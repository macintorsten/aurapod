/**
 * Validation utilities
 */

/**
 * Validate URL format
 * @param url - URL string to validate
 * @returns true if valid URL, false otherwise
 */
export function isValidUrl(url: string): boolean {
  if (!url) return false;

  try {
    new URL(url);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Validate RSS/XML feed URL
 * @param url - URL to check for feed patterns
 * @returns true if URL matches common feed patterns
 */
export function isValidFeedUrl(url: string): boolean {
  if (!isValidUrl(url)) return false;

  // Check for common feed patterns
  const feedPatterns = [
    /\.rss$/i,
    /\.xml$/i,
    /\/feed\/?$/i,
    /\/rss\/?$/i,
    /\/podcast\/?$/i,
  ];

  return feedPatterns.some((pattern) => pattern.test(url));
}

/**
 * Validate audio URL
 * @param url - URL to check for audio file extension
 * @returns true if URL contains common audio file extension
 */
export function isValidAudioUrl(url: string): boolean {
  if (!isValidUrl(url)) return false;

  const audioExtensions = [".mp3", ".m4a", ".wav", ".ogg", ".aac", ".opus"];
  const lowerUrl = url.toLowerCase();

  return audioExtensions.some((ext) => lowerUrl.includes(ext));
}

/**
 * Sanitize HTML string (basic XSS protection)
 * @param html - HTML string to sanitize
 * @returns Sanitized HTML string with only text content
 */
export function sanitizeHtml(html: string): string {
  if (!html) return "";

  const div = document.createElement("div");
  div.textContent = html;
  return div.innerHTML;
}

/**
 * Check if string is empty or whitespace
 * @param str - String to check
 * @returns true if string is null, undefined, or only whitespace
 */
export function isEmpty(str: string | null | undefined): boolean {
  return !str || str.trim().length === 0;
}

/**
 * Validate playback progress (0-1)
 * @param progress - Progress value to validate
 * @returns true if progress is a finite number between 0 and 1
 */
export function isValidProgress(progress: number): boolean {
  return (
    typeof progress === "number" &&
    isFinite(progress) &&
    progress >= 0 &&
    progress <= 1
  );
}

