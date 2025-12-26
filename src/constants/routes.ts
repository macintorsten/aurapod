/**
 * Route paths and view identifiers
 */

/**
 * URL encoding/decoding utilities for route parameters
 */

export const encodeFeedUrl = (feedUrl: string): string => {
  return encodeURIComponent(feedUrl);
};

export const decodeFeedUrl = (encoded: string): string => {
  return decodeURIComponent(encoded);
};

export const decodeEpisodeId = (encoded: string): string => {
  return decodeURIComponent(encoded);
};

/**
 * Helper to build podcast detail route
 */
export const buildPodcastRoute = (feedUrl: string, episodeId?: string): string => {
  const encodedFeed = encodeFeedUrl(feedUrl);
  if (episodeId) {
    return `/podcast/${encodedFeed}/episode/${encodeURIComponent(episodeId)}`;
  }
  return `/podcast/${encodedFeed}`;
};
