/**
 * Share Service - URL encoding/decoding and feed serialization
 *
 * This service handles converting between Episode and Track formats,
 * compressing feeds into URL-safe strings, and generating shareable links.
 *
 * Architecture: Uses dependency injection for testability.
 * - createShareService(deps) - factory function accepting dependencies
 * - shareService - default export with real dependencies
 *
 * For Testing:
 * ```typescript
 * const mockRssService = { fetchPodcast: vi.fn() };
 * const testService = createShareService({
 *   rssService: mockRssService,
 *   packt: mockPackt,
 * });
 * // Now test without cascading mocks
 * ```
 *
 * @see DEVELOPMENT.md - Service dependency architecture
 * @see TESTING_GUIDE.md - Service testing patterns
 */

import type { Feed, Track, CompressionOptions } from '../lib/packt';
import { compressFeed, decompressFeed } from '../lib/packt';
import { rssService } from './rssService';
import { Episode } from '../types';
import { getAppBaseUrl } from '../utils';
import { APP_CONFIG } from '../config';

// Re-export Packt types for convenience
export type { Feed, Track, CompressionOptions };

export type ShareType = 'track' | 'frequency';
export type ShareMode = 'wave-source' | 'embedded-payload' | 'rss-source';
export type CompressionMode = 'full' | 'auto' | 'minimal';

export interface FilterOptions {
  includeDescriptions: boolean;
  includeImages: boolean;
  includeDatesAndDurations: boolean;
  compressionMode?: CompressionMode;
}

// Extended Feed with share metadata
export interface ShareData {
  feed: Feed;
  shareType?: ShareType;
  shareMode?: ShareMode;
  episodeId?: string;  // For wave-source mode
}

/**
 * Service dependencies for share service
 */
export interface ShareServiceDependencies {
  rssService: typeof rssService;
  packt: {
    compressFeed: typeof compressFeed;
    decompressFeed: typeof decompressFeed;
  };
}

/**
 * Create share service with injected dependencies.
 *
 * @param deps Service dependencies (rssService, packt library functions)
 * @returns ShareService instance with all methods bound to provided dependencies
 *
 * For testing, pass mocked dependencies:
 * ```typescript
 * const mockRssService = { fetchPodcast: vi.fn() };
 * const service = createShareService({
 *   rssService: mockRssService,
 *   packt: { compressFeed: vi.fn(), decompressFeed: vi.fn() }
 * });
 * ```
 */
export const createShareService = (deps: ShareServiceDependencies) => {
  // Define the service object so methods can reference each other
  // Using 'any' type casting to avoid circular type reference
  const service: any = {
  /**
   * Convert Episode to Track format
   */
  episodeToTrack: (episode: Episode): Track => {
    return {
      title: episode.title || null,
      url: episode.audioUrl || null,
      description: shareService.sanitizeDescription(episode.description) || null,
      date: episode.pubDate ? Math.floor(new Date(episode.pubDate).getTime() / 1000) : null,
      duration: episode.duration ? shareService.parseDuration(episode.duration) : null,
      image: episode.image || null,
    };
  },

  /**
   * Convert Track to Episode format (for display)
   */
  trackToEpisode: (track: Track, podcastId: string, index: number, feedImage?: string): Episode => {
    return {
      id: `shared-${index}`,
      podcastId,
      title: track.title || 'Untitled',
      description: track.description || '',
      audioUrl: track.url || '',
      pubDate: track.date ? new Date(track.date * 1000).toISOString() : new Date().toISOString(),
      duration: track.duration ? shareService.formatDuration(track.duration) : '00:00',
      link: track.url || '',
      image: track.image || feedImage || undefined,
    };
  },

  /**
   * Parse duration string (HH:MM:SS or MM:SS or seconds) to seconds
   */
  parseDuration: (duration: string): number => {
    const parts = duration.split(':').map(Number);
    if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else if (parts.length === 2) {
      return parts[0] * 60 + parts[1];
    }
    return parseInt(duration) || 0;
  },

  /**
   * Format duration in seconds to HH:MM:SS or MM:SS string
   */
  formatDuration: (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  },

  /**
   * Cleans up HTML and truncates description
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
   * Compress and encode feed to URL-safe string
   */
  encode: (feed: Feed, options?: { maxChars?: number; compressionMode?: CompressionMode; removeImages?: boolean }): string => {
    const mode = options?.compressionMode || 'auto';
    const compressionOptions: CompressionOptions = {};
    
    // Configure compression based on mode
    if (mode === 'full') {
      // Full mode: minimal compression, preserve most data
      // Don't set maxChars to allow natural compression without auto-optimization
      compressionOptions.maxDescriptionLength = 300;
      compressionOptions.maxTitleLength = undefined; // No title truncation
    } else if (mode === 'auto') {
      // Auto mode: adaptive compression to fit target size
      compressionOptions.maxChars = options?.maxChars || 1900;
      // Let auto-optimization handle the rest
    } else if (mode === 'minimal') {
      // Minimal mode: aggressive compression
      compressionOptions.maxChars = options?.maxChars || 800;
      compressionOptions.removeDescriptions = true;
      compressionOptions.maxTitleLength = 15;
      compressionOptions.preserveDescriptions = false; // Ensure descriptions can be removed
    }
    
    if (options?.removeImages) {
      compressionOptions.removeImages = true;
    }
    
    const result = deps.packt.compressFeed(feed, compressionOptions);
    return result.data;
  },

  /**
   * Decode and decompress feed from string
   */
  decode: (str: string): Feed | null => {
    try {
      return deps.packt.decompressFeed(str);
    } catch (e) {
      console.error("Failed to decode share URL:", e);
      return null;
    }
  },

  /**
   * Generate share URL
   */
  generateUrl: (
    shareData: ShareData,
    options?: { compressionMode?: CompressionMode; removeImages?: boolean }
  ): { url: string; length: number; isTooLong: boolean; payloadLength: number; warning?: string } => {
    const { feed, shareType, shareMode, episodeId } = shareData;
    const baseUrl = getAppBaseUrl(APP_CONFIG.baseUrl);
    
    // Special handling for RSS frequency mode - direct link to podcast
    if (shareType === 'frequency' && shareMode === 'rss-source' && feed.url) {
      const podcastUrl = `${baseUrl}/#/podcast/${encodeURIComponent(feed.url)}`;
      
      return {
        url: podcastUrl,
        length: podcastUrl.length,
        isTooLong: false,
        payloadLength: 0,
        warning: undefined
      };
    }
    
    // Special handling for wave-source mode - direct link to episode
    if (shareType === 'track' && shareMode === 'wave-source' && feed.url && episodeId) {
      const episodeUrl = `${baseUrl}/#/podcast/${encodeURIComponent(feed.url)}/episode/${encodeURIComponent(episodeId)}`;
      
      return {
        url: episodeUrl,
        length: episodeUrl.length,
        isTooLong: false,
        payloadLength: 0,
        warning: undefined
      };
    }
    
    // For all other modes, encode with Packt
    try {
      const code = service.encode(feed, {
        compressionMode: options?.compressionMode || 'auto',
        maxChars: 1900,
        removeImages: options?.removeImages,
      });

      const finalUrl = `${baseUrl}/#/?s=${code}`;

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
    } catch (error) {
      // If compression fails, return an error state with a helpful warning
      const errorMessage = error instanceof Error ? error.message : 'Failed to compress feed data';
      
      return {
        url: '',
        length: 0,
        isTooLong: true,
        payloadLength: 0,
        warning: `Cannot generate shareable link: ${errorMessage}. Try sharing with RSS/wave mode or reducing the number of episodes.`
      };
    }
  },

  /**
   * Apply filters to tracks
   */
  applyFilters: (tracks: Track[], filters: FilterOptions): Track[] => {
    return tracks.map(track => {
      const filtered: Track = {
        title: track.title,
        url: track.url,
      };
      
      if (filters.includeDescriptions && track.description) {
        filtered.description = track.description;
      } else {
        filtered.description = null;
      }
      
      if (filters.includeImages && track.image) {
        filtered.image = track.image;
      } else {
        filtered.image = null;
      }
      
      if (filters.includeDatesAndDurations) {
        filtered.date = track.date;
        filtered.duration = track.duration;
      } else {
        filtered.date = null;
        filtered.duration = null;
      }
      
      return filtered;
    });
  },

  /**
   * Calculate maximum episodes that fit within character limit using binary search
   */
  calculateMaxEpisodes: async (
    feedUrl: string,
    filters: FilterOptions,
    podcastTitle?: string,
    podcastImage?: string,
    podcastDescription?: string
  ): Promise<{ maxEpisodes: number; totalEpisodes: number }> => {
    try {
      const { podcast, episodes: fetchedEpisodes } = await deps.rssService.fetchPodcast(feedUrl);
      const totalEpisodes = fetchedEpisodes.length;
      
      if (totalEpisodes === 0) {
        return { maxEpisodes: 0, totalEpisodes: 0 };
      }
      
      const service = createShareService(deps); // Reference self for method calls
      const tracks: Track[] = fetchedEpisodes.map((ep) => ({
        title: ep.title || null,
        url: ep.audioUrl || null,
        description: service.sanitizeDescription(ep.description) || null,
        date: ep.pubDate ? Math.floor(new Date(ep.pubDate).getTime() / 1000) : null,
        duration: ep.duration ? service.parseDuration(ep.duration) : null,
      }));
      
      // Binary search for max episode count
      let left = 1;
      let right = totalEpisodes;
      let maxEpisodes = 1;
      
      while (left <= right) {
        const mid = Math.floor((left + right) / 2);
        const testTracks = tracks.slice(0, mid);
        const filteredTracks = service.applyFilters(testTracks, filters);
        
        const testFeed: Feed = {
          title: podcastTitle || podcast.title || null,
          description: podcastDescription ? service.sanitizeDescription(podcastDescription) : podcast.description || null,
          url: feedUrl || null,
          tracks: filteredTracks,
        };
        
        try {
          const { length } = service.generateUrl({
            feed: testFeed,
            shareType: 'frequency',
            shareMode: 'embedded-payload',
          }, {
            compressionMode: filters.compressionMode || 'auto',
            removeImages: !filters.includeImages,
          });
          
          if (length <= 2000) {
            maxEpisodes = mid;
            left = mid + 1;
          } else {
            right = mid - 1;
          }
        } catch (e) {
          right = mid - 1;
        }
      }
      
      return { maxEpisodes, totalEpisodes };
    } catch (error) {
      console.error('Failed to calculate max episodes:', error);
      return { maxEpisodes: 10, totalEpisodes: 10 };
    }
  },
  };

  return service;
};

/**
 * Default share service instance with real dependencies.
 *
 * This is the singleton instance used throughout the application.
 * It uses real implementations of rssService and the packt compression library.
 *
 * For testing, create a new instance via createShareService() with mocked dependencies:
 * ```typescript
 * const testService = createShareService({
 *   rssService: mockRssService,
 *   packt: mockPackt,
 * });
 * ```
 */
export const shareService = createShareService({
  rssService,
  packt: { compressFeed, decompressFeed },
});

