/**
 * Represents a track/episode in a feed
 */
export interface Track {
  /** Track title */
  title?: string | null;
  /** URL to the audio file */
  url?: string | null;
  /** Publication date as Unix timestamp (seconds) */
  date?: number | null;
  /** Duration in seconds */
  duration?: number | null;
  /** Description/summary of the track */
  description?: string | null;
  /** Image/artwork URL */
  image?: string | null;
}

/**
 * Represents a feed (e.g., podcast RSS feed)
 */
export interface Feed {
  /** Feed title */
  title?: string | null;
  /** Feed description */
  description?: string | null;
  /** Feed URL */
  url?: string | null;
  /** Feed image/artwork URL */
  image?: string | null;
  /** Array of tracks in the feed */
  tracks: Track[];
}

/**
 * Options for compression
 * 
 * When maxChars is specified, the library automatically optimizes to fit within the limit.
 * Otherwise, applies the specified truncation/removal settings directly.
 */
export interface CompressionOptions {
  // Direct compression settings
  /** Maximum title length (truncates longer titles) */
  maxTitleLength?: number;
  /** Maximum description length (truncates longer descriptions) */
  maxDescriptionLength?: number;
  /** Remove all descriptions */
  removeDescriptions?: boolean;
  /** Remove all images */
  removeImages?: boolean;
  /** Remove specific fields by name (e.g., ['guid', 'episodeType']) */
  removeFields?: string[];
  
  // Auto-optimization (triggers when maxChars is set)
  /** Maximum compressed string length - triggers auto-optimization to fit */
  maxChars?: number;
  /** Fixed number of tracks to include (undefined = optimize track count) */
  trackCount?: number;
  /** Preserve descriptions during auto-optimization (prevents removal) */
  preserveDescriptions?: boolean;
  /** Preserve these fields during auto-optimization (prevents removal) */
  preserveFields?: string[];
}

/**
 * Result from compression operations
 */
export interface CompressionResult {
  /** Compressed base64url string */
  data: string;
  /** Length of compressed string in characters */
  length: number;
  /** Number of tracks included */
  trackCount: number;
  /** Strategy used (only present when auto-optimized with maxChars) */
  strategy?: CompressionOptions;
}

/**
 * Short key mapping for compressed format
 * Single-character keys to minimize size
 */
export const TRACK_KEYS = {
  title: 't',
  url: 'u',
  date: 'd',
  duration: 'du',
  description: 'de',
  image: 'i',
} as const;

export const FEED_KEYS = {
  title: 't',
  description: 'd',
  image: 'i',
  url: 'u',
  tracks: 'tr',
} as const;

/**
 * Type for compressed track with short keys
 */
export type CompressedTrack = {
  [K in keyof typeof TRACK_KEYS]?: any;
};

/**
 * Type for compressed feed with short keys
 */
export type CompressedFeed = {
  [K in keyof typeof FEED_KEYS]?: any;
};
