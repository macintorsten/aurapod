
import pako from 'pako';

export interface SharedData {
  f?: string[]; // feedUrls
  p?: string;   // activePodcastFeedUrl
  e?: string;   // activeEpisodeId
}

export const shareService = {
  /**
   * Compresses and encodes data to a URL-safe string
   */
  encode: (data: SharedData): string => {
    const json = JSON.stringify(data);
    const compressed = pako.deflate(json);
    // Use a loop for binary conversion to avoid stack size limits
    let binary = '';
    for (let i = 0; i < compressed.length; i++) {
      binary += String.fromCharCode(compressed[i]);
    }
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  },

  /**
   * Decodes and decompresses data from a string
   */
  decode: (str: string): SharedData | null => {
    try {
      const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
      const binary = atob(base64);
      const uint8 = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        uint8[i] = binary.charCodeAt(i);
      }
      const decompressed = pako.inflate(uint8, { to: 'string' });
      return JSON.parse(decompressed);
    } catch (e) {
      console.error("Failed to decode share URL:", e);
      return null;
    }
  },

  /**
   * Generates the full share URL.
   * Note: For cross-device sharing to work, the app must be hosted on a public URL (e.g., GitHub Pages).
   */
  generateUrl: (data: SharedData): { url: string; length: number; isTooLong: boolean } => {
    const code = shareService.encode(data);
    
    // 1. Get the absolute base path (strip existing query and hash)
    let baseUrl = window.location.href.split('?')[0].split('#')[0];
    
    // 2. Strip 'blob:' if present (common in some sandbox/preview environments)
    // This allows the link to at least look like a valid web URL.
    if (baseUrl.startsWith('blob:')) {
      baseUrl = baseUrl.substring(5);
    }

    // 3. Construct final URL using URL object for proper encoding
    let finalUrl: string;
    try {
      const urlObj = new URL(baseUrl);
      urlObj.searchParams.set('s', code);
      finalUrl = urlObj.toString();
    } catch (e) {
      // Fallback to basic string manipulation if URL constructor fails
      const separator = baseUrl.includes('?') ? '&' : '?';
      finalUrl = `${baseUrl}${separator}s=${code}`;
    }

    return {
      url: finalUrl,
      length: finalUrl.length,
      isTooLong: finalUrl.length > 1800
    };
  }
};
