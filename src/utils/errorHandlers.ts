/**
 * Error handling utilities
 */

import { AppError, ErrorCategory } from '../types';

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
 * Check if error is a network error
 */
export function isNetworkError(error: any): boolean {
  return (
    error?.message?.includes('fetch') ||
    error?.message?.includes('network') ||
    error?.message?.includes('NetworkError') ||
    error?.name === 'NetworkError'
  );
}

/**
 * Check if error is a CORS error
 */
export function isCORSError(error: any): boolean {
  return (
    error?.message?.includes('CORS') ||
    error?.message?.includes('cors') ||
    error?.diagnostics?.corsIssue
  );
}

/**
 * Get user-friendly error message
 */
export function getUserFriendlyMessage(error: AppError): string {
  switch (error.category) {
    case 'network':
      return 'Network error. Please check your connection.';
    case 'feed':
      return 'Failed to load podcast feed. The feed may be invalid or unavailable.';
    case 'playback':
      return 'Playback error. The audio file may be unavailable.';
    case 'storage':
      return 'Storage error. Your browser may have run out of space.';
    case 'cast':
      return 'Chromecast connection error.';
    case 'share':
      return 'Failed to process shared content.';
    default:
      return 'An unexpected error occurred.';
  }
}

/**
 * Log error to console with formatting
 */
export function logError(error: AppError): void {
  console.error(
    `[AuraPod:${error.category}]`,
    error.message,
    error
  );
}
