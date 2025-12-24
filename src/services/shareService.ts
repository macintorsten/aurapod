
import pako from 'pako';
import { rssService } from './rssService';
import { Episode } from '../types';
import { getAppBaseUrl } from '../utils';
import { APP_CONFIG } from '../config';

export type ShareType = 'track' | 'rss';
export type ShareMode = 'wave-source' | 'embedded-payload' | 'frequency' | 'full-manifest';

export interface FilterOptions {
  includeDescriptions: boolean;
  includeImages: boolean;
  includeDatesAndDurations: boolean;
}

export interface MinimalEpisode {
  id: string;
  title: string;
  audioUrl: string;
  image?: string;
  description?: string;
  pubDate?: string;
  duration?: string;
}

export interface SharedData {
  // Share context
  shareType?: ShareType;
  shareMode?: ShareMode;
  
  // RSS/Podcast data
  p?: string;   // activePodcastFeedUrl (RSS Source)
  pt?: string;  // podcast title
  pi?: string;  // podcast image
  pd?: string;  // podcast description
  
  // Single episode data
  e?: string;   // activeEpisodeId (GUID)
  t?: string;   // title
  i?: string;   // image
  d?: string;   // description
  u?: string;   // audioUrl
  st?: string;  // series title (Podcast Name)
  si?: string;  // series image (Podcast Image)
  
  // RSS manifest (multiple episodes)
  episodes?: MinimalEpisode[];
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
    // Get base URL for the application (handles subfolder deployments)
    const baseUrl = getAppBaseUrl(APP_CONFIG.baseUrl);
    
    // Special handling for RSS frequency mode - just link to podcast page
    if (data.shareType === 'rss' && data.shareMode === 'frequency' && data.p) {
      // Construct podcast URL with hash routing
      const podcastUrl = `${baseUrl}/#/podcast/${encodeURIComponent(data.p)}`;
      
      return {
        url: podcastUrl,
        length: podcastUrl.length,
        isTooLong: false,
        payloadLength: 0,
        warning: undefined
      };
    }
    
    // Special handling for track wave-source mode - link to podcast page with episode
    if (data.shareType === 'track' && data.shareMode === 'wave-source' && data.p && data.e) {
      // Construct podcast/episode URL with hash routing
      const episodeUrl = `${baseUrl}/#/podcast/${encodeURIComponent(data.p)}/${encodeURIComponent(data.e)}`;
      
      return {
        url: episodeUrl,
        length: episodeUrl.length,
        isTooLong: false,
        payloadLength: 0,
        warning: undefined
      };
    }
    
    // For all other modes, encode the data
    const code = shareService.encode(data);

    // Put query parameter inside the hash fragment for consistency with hash routing
    // Format: baseUrl/#/?s=encodedData
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
  },

  /**
   * Applies filter options to episode data
   */
  applyFilters: (episodes: MinimalEpisode[], filters: FilterOptions): MinimalEpisode[] => {
    return episodes.map(ep => {
      const filtered: MinimalEpisode = {
        id: ep.id,
        title: ep.title,
        audioUrl: ep.audioUrl,
      };
      
      if (filters.includeImages && ep.image) {
        filtered.image = ep.image;
      }
      if (filters.includeDescriptions && ep.description) {
        filtered.description = ep.description;
      }
      if (filters.includeDatesAndDurations) {
        if (ep.pubDate) filtered.pubDate = ep.pubDate;
        if (ep.duration) filtered.duration = ep.duration;
      }
      
      return filtered;
    });
  },

  /**
   * Calculates optimal filters to stay under URL length limit
   * Priority order: descriptions → images → dates/durations
   */
  calculateOptimalFilters: async (
    feedUrl: string,
    episodeCount: number,
    podcastTitle?: string,
    podcastImage?: string,
    podcastDescription?: string
  ): Promise<{
    filters: FilterOptions;
    episodes: MinimalEpisode[];
    urlLength: number;
    isTooLong: boolean;
  }> => {
    // Fetch RSS feed
    const { podcast, episodes: fetchedEpisodes } = await rssService.fetchPodcast(feedUrl);
    const allEpisodes = fetchedEpisodes.slice(0, episodeCount);
    
    // Convert to minimal format
    const minimalEpisodes: MinimalEpisode[] = allEpisodes.map((ep) => ({
      id: ep.id,
      title: ep.title,
      audioUrl: ep.audioUrl,
      image: ep.image,
      description: shareService.sanitizeDescription(ep.description),
      pubDate: ep.pubDate,
      duration: ep.duration,
    }));

    // Try with all fields first
    const filterCombinations: FilterOptions[] = [
      { includeDescriptions: true, includeImages: true, includeDatesAndDurations: true },
      { includeDescriptions: false, includeImages: true, includeDatesAndDurations: true },
      { includeDescriptions: false, includeImages: false, includeDatesAndDurations: true },
      { includeDescriptions: false, includeImages: false, includeDatesAndDurations: false },
    ];

    for (const filters of filterCombinations) {
      const filteredEpisodes = shareService.applyFilters(minimalEpisodes, filters);
      const testData: SharedData = {
        shareType: 'rss',
        shareMode: 'full-manifest',
        p: feedUrl,
        pt: podcastTitle,
        pi: podcastImage,
        pd: podcastDescription ? shareService.sanitizeDescription(podcastDescription) : undefined,
        episodes: filteredEpisodes,
      };
      
      const { length, isTooLong } = shareService.generateUrl(testData);
      
      if (!isTooLong || filters === filterCombinations[filterCombinations.length - 1]) {
        return {
          filters,
          episodes: filteredEpisodes,
          urlLength: length,
          isTooLong,
        };
      }
    }

    // Fallback (shouldn't reach here)
    return {
      filters: filterCombinations[0],
      episodes: minimalEpisodes,
      urlLength: 0,
      isTooLong: true,
    };
  },

  /**
   * Generates share data for RSS manifest mode with optimal filtering
   */
  generateRssManifestData: async (
    feedUrl: string,
    episodeCount: number,
    filters: FilterOptions,
    podcastTitle?: string,
    podcastImage?: string,
    podcastDescription?: string
  ): Promise<{ data: SharedData; urlLength: number; isTooLong: boolean }> => {
    const { podcast, episodes: fetchedEpisodes } = await rssService.fetchPodcast(feedUrl);
    const allEpisodes = fetchedEpisodes.slice(0, episodeCount);
    
    const minimalEpisodes: MinimalEpisode[] = allEpisodes.map((ep) => ({
      id: ep.id,
      title: ep.title,
      audioUrl: ep.audioUrl,
      image: ep.image,
      description: shareService.sanitizeDescription(ep.description),
      pubDate: ep.pubDate,
      duration: ep.duration,
    }));

    const filteredEpisodes = shareService.applyFilters(minimalEpisodes, filters);
    
    const data: SharedData = {
      shareType: 'rss',
      shareMode: 'full-manifest',
      p: feedUrl,
      pt: podcastTitle || podcast.title,
      pi: podcastImage || podcast.image,
      pd: podcastDescription ? shareService.sanitizeDescription(podcastDescription) : undefined,
      episodes: filteredEpisodes,
    };

    const { length, isTooLong } = shareService.generateUrl(data);
    
    return { data, urlLength: length, isTooLong };
  }
};
