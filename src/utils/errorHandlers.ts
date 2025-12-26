/**
 * Error handling utilities
 * 
 * NOTE: Removed unused functions (isNetworkError, isCORSError, getUserFriendlyMessage)
 * that had no callers in the codebase. See git history if needed.
 */

import { AppError, ErrorCategory } from "../types";

/**
 * Create a standardized error object
 */
export function createError(
  category: ErrorCategory,
  message: string,
  error?: any,
  context?: any
): AppError {
  const diagnostics = (error as any)?.diagnostics || {};

  return {
    category,
    message,
    details: error?.stack || error?.message || String(error),
    timestamp: Date.now(),
    context: {
      ...context,
      diagnostics,
      userAgent: navigator.userAgent,
      href: window.location.href,
    },
  };
}

/**
 * Log error to console with formatting
 */
export function logError(error: AppError): void {
  console.error(`[AuraPod:${error.category}]`, error.message, error);
}
