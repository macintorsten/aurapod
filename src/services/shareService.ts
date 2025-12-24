
import pako from 'pako';

export interface SharedData {
  f?: string[]; // feedUrls (Discovery Collection)
  p?: string;   // activePodcastFeedUrl (RSS Source)
  e?: string;   // activeEpisodeId (GUID)
  // Universal Metadata for Standalone Playback
  t?: string;   // title
  i?: string;   // image
  d?: string;   // description
  u?: string;   // audioUrl
  st?: string;  // series title (Podcast Name)
  si?: string;  // series image (Podcast Image)
}

export const shareService = {
  /**
   * Cleans up HTML and truncates description to keep URL size manageable
   */
  sanitizeDescription: (html: string): string => {
    const tmp = document.createElement("DIV");
    tmp.innerHTML = html;
    let text = tmp.textContent || tmp.innerText || "";
    if (text.length > 300) {
      text = text.substring(0, 297) + "...";
    }
    return text.trim();
  },

  /**
   * Compresses and encodes data to a URL-safe string
   */
  encode: (data: SharedData): string => {
    const json = JSON.stringify(data);
    const compressed = pako.deflate(json);
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
   */
  generateUrl: (data: SharedData): { url: string; length: number; isTooLong: boolean; payloadLength: number; warning?: string } => {
    const code = shareService.encode(data);
    
    let baseUrl = window.location.href.split('?')[0].split('#')[0];
    if (baseUrl.startsWith('blob:')) {
      baseUrl = baseUrl.substring(5);
    }

    let finalUrl: string;
    try {
      const urlObj = new URL(baseUrl);
      urlObj.searchParams.set('s', code);
      finalUrl = urlObj.toString();
    } catch (e) {
      const separator = baseUrl.includes('?') ? '&' : '?';
      finalUrl = `${baseUrl}${separator}s=${code}`;
    }

    const isTooLong = finalUrl.length > 2000;
    const warning = isTooLong 
      ? `URL exceeds 2000 characters (${finalUrl.length}). Some older browsers or platforms may not support URLs this long.`
      : undefined;

    return {
      url: finalUrl,
      length: finalUrl.length,
      isTooLong,
      payloadLength: code.length,
      warning
    };
  }
};
