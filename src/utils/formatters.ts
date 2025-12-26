/**
 * Formatting utilities for dates, times, and durations
 * 
 * NOTE: Removed unused functions (formatDate, formatFileSize) that had no callers in the codebase.
 * See git history if needed.
 */

/**
 * Format timestamp for display (e.g., "Nov 20, 2023")
 */
export function formatTimestamp(timestamp: number): string {
  // Validate input first - NaN doesn't throw but creates "Invalid Date" string
  if (isNaN(timestamp)) {
    return "Invalid timestamp";
  }
  
  try {
    const date = new Date(timestamp);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch (e) {
    return "Invalid timestamp";
  }
}

/**
 * Format seconds to MM:SS or HH:MM:SS
 */
export function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return "0:00";

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  }

  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Parse duration string (e.g., "1:23:45" or "45:30") to seconds
 */
export function parseDuration(durationStr: string): number {
  if (!durationStr) return 0;

  try {
    const parts = durationStr.split(":").map(Number);

    if (parts.length === 3) {
      // HH:MM:SS
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else if (parts.length === 2) {
      // MM:SS
      return parts[0] * 60 + parts[1];
    } else if (parts.length === 1) {
      // SS
      return parts[0];
    }
  } catch (e) {
    console.warn("Failed to parse duration:", durationStr, e);
  }

  return 0;
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + "...";
}
