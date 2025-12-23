/**
 * Validation utilities
 */

/**
 * Validate URL format
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
 */
export function isValidAudioUrl(url: string): boolean {
  if (!isValidUrl(url)) return false;

  const audioExtensions = [".mp3", ".m4a", ".wav", ".ogg", ".aac", ".opus"];
  const lowerUrl = url.toLowerCase();

  return audioExtensions.some((ext) => lowerUrl.includes(ext));
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  if (!email) return false;

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Sanitize HTML string (basic XSS protection)
 */
export function sanitizeHtml(html: string): string {
  if (!html) return "";

  const div = document.createElement("div");
  div.textContent = html;
  return div.innerHTML;
}

/**
 * Check if string is empty or whitespace
 */
export function isEmpty(str: string | null | undefined): boolean {
  return !str || str.trim().length === 0;
}

/**
 * Validate playback progress (0-1)
 */
export function isValidProgress(progress: number): boolean {
  return (
    typeof progress === "number" &&
    isFinite(progress) &&
    progress >= 0 &&
    progress <= 1
  );
}
