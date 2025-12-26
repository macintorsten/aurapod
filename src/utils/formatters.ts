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
