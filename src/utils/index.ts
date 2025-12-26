/**
 * Barrel export for all utilities
 */

export * from "./formatters";
export * from "./errorHandlers";

/**
 * Gets the base URL for the application.
 * This handles cases where the app is deployed in a subfolder.
 * 
 * With hash-based routing (HashRouter), everything before the # is the base URL,
 * and everything after the # is the route. This makes detection simple and reliable.
 * 
 * Example: https://example.com/myapp/#/podcast/123
 *   - Base URL: https://example.com/myapp/
 *   - Route: /podcast/123
 * 
 * Priority:
 * 1. Explicit config if provided
 * 2. HTML <base> tag if present
 * 3. Auto-detect: origin + pathname (everything before the #)
 * 
 * @param configBaseUrl Optional base URL from config
 * @returns The base URL for generating share links
 */
export function getAppBaseUrl(configBaseUrl?: string): string {
  // 1. Use explicit config if provided
  if (configBaseUrl) {
    return configBaseUrl.replace(/\/$/, ''); // Remove trailing slash
  }

  // Safety check for window.location
  if (typeof window === 'undefined' || !window.location) {
    return '';
  }

  // 2. Check for <base> tag
  if (typeof document !== 'undefined') {
    const baseTag = document.querySelector('base');
    if (baseTag?.href) {
      try {
        const baseUrl = new URL(baseTag.href, window.location.origin);
        return baseUrl.origin + baseUrl.pathname.replace(/\/$/, '');
      } catch (e) {
        // If parsing fails, fall through to next method
      }
    }
  }

  // 3. Auto-detect from current URL
  // With hash routing, everything before the # is the base URL
  const { origin, pathname } = window.location;
  
  if (!origin) {
    return '';
  }

  // Combine origin and pathname, removing trailing slashes and index.html
  let baseUrl = origin;
  if (pathname && pathname !== '/') {
    let cleanPath = pathname.replace(/\/$/, ''); // Remove trailing slash
    cleanPath = cleanPath.replace(/\/index\.html$/, ''); // Remove /index.html
    baseUrl = origin + cleanPath;
  }
  
  return baseUrl;
}
