/**
 * Route paths and view identifiers
 */

export const ROUTES = {
  HOME: "/",
  PODCAST: "/podcast/:feedUrl",
  PODCAST_EPISODE: "/podcast/:feedUrl/episode/:episodeId",
  ARCHIVE: "/archive",
  NEW: "/new",
} as const;

export const VIEWS = {
  HOME: "home",
  PODCAST: "podcast",
  ARCHIVE: "archive",
  NEW: "new",
} as const;

export type View = (typeof VIEWS)[keyof typeof VIEWS];

/**
 * URL encoding/decoding utilities for route parameters
 */

export const encodeFeedUrl = (feedUrl: string): string => {
  return encodeURIComponent(feedUrl);
};

export const decodeFeedUrl = (encoded: string): string => {
  return decodeURIComponent(encoded);
};

export const encodeEpisodeId = (episodeId: string): string => {
  return encodeURIComponent(episodeId);
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
    return `/podcast/${encodedFeed}/episode/${encodeEpisodeId(episodeId)}`;
  }
  return `/podcast/${encodedFeed}`;
};
