/**
 * Validation utilities
 * 
 * NOTE: This file previously contained several unused validation functions
 * (isValidUrl, isValidFeedUrl, isValidAudioUrl, sanitizeHtml, isEmpty, isValidProgress)
 * which have been removed as they were not used anywhere in the codebase.
 * 
 * See git history (commits before removal) if these functions are needed in the future.
 * 
 * If validation is needed in the future, consider:
 * - For URL validation: Use browser's native URL constructor
 * - For HTML sanitization: Use DOMPurify library with proper whitelist
 * - For audio URL validation: Check HTTP Content-Type header from response, not URL pattern
 */

// This file intentionally left minimal - all previous functions were unused
