import {
  Track,
  Feed,
  CompressionOptions,
  CompressionResult,
} from './types';
import { reduceTrack, reduceFeed } from './reducer';
import {
  trackToShortKeys,
  shortKeysToTrack,
  feedToShortKeys,
  shortKeysToFeed,
  encodeMsgpack,
  decodeMsgpack,
} from './encoder';
import {
  compress,
  decompress,
  toBase64Url,
  fromBase64Url,
} from './compressor';

// Re-export only public types
export type { Track, Feed, CompressionOptions, CompressionResult } from './types';

/**
 * Compress a track with optional auto-optimization
 * 
 * @param track - Track to compress
 * @param options - Compression options. If maxChars is set, auto-optimizes to fit.
 * @returns Compression result with metadata
 * 
 * @example
 * // Direct compression
 * const result = compressTrack(track, { maxTitleLength: 30 });
 * 
 * // Auto-optimize to fit in 300 chars
 * const result = compressTrack(track, { maxChars: 300 });
 * 
 * // Auto-optimize with constraints
 * const result = compressTrack(track, {
 *   maxChars: 300,
 *   preserveDescriptions: true  // Don't remove description
 * });
 */
export function compressTrack(track: Track, options: CompressionOptions = {}): CompressionResult {
  // If maxChars is specified, use auto-optimization
  if (options.maxChars !== undefined) {
    return autoOptimizeTrack(track, options.maxChars, options);
  }
  
  // Otherwise, direct compression with specified options
  const reduced = reduceTrack(track, options);
  const shortKeys = trackToShortKeys(reduced);
  const msgpack = encodeMsgpack(shortKeys);
  const compressed = compress(msgpack);
  const data = toBase64Url(compressed);
  
  return {
    data,
    length: data.length,
    trackCount: 1,
  };
}

/**
 * Decompress a track from compressed string
 */
export function decompressTrack(compressed: string): Track {
  const compressedData = fromBase64Url(compressed);
  const msgpack = decompress(compressedData);
  const shortKeys = decodeMsgpack(msgpack);
  return shortKeysToTrack(shortKeys);
}

/**
 * Compress a feed with optional auto-optimization
 * 
 * @param feed - Feed to compress
 * @param options - Compression options. If maxChars is set, auto-optimizes to fit.
 * @returns Compression result with metadata
 * 
 * @example
 * // Direct compression
 * const result = compressFeed(feed, { 
 *   maxTitleLength: 30,
 *   removeDescriptions: true 
 * });
 * 
 * // Auto-optimize to fit in 1900 chars (URL-safe)
 * const result = compressFeed(feed, { maxChars: 1900 });
 * 
 * // Auto-optimize with constraints
 * const result = compressFeed(feed, {
 *   maxChars: 1900,
 *   trackCount: 50,             // Include exactly 50 tracks
 *   preserveDescriptions: true  // Don't remove descriptions
 * });
 */
export function compressFeed(feed: Feed, options: CompressionOptions = {}): CompressionResult {
  // If maxChars is specified, use auto-optimization
  if (options.maxChars !== undefined) {
    return autoOptimizeFeed(feed, options.maxChars, options);
  }
  
  // Otherwise, direct compression with specified options
  const reduced = reduceFeed(feed, options);
  const shortKeys = feedToShortKeys(reduced);
  const msgpack = encodeMsgpack(shortKeys);
  const compressed = compress(msgpack);
  const data = toBase64Url(compressed);
  
  return {
    data,
    length: data.length,
    trackCount: reduced.tracks.length,
  };
}

/**
 * Decompress a feed from compressed string
 */
export function decompressFeed(compressed: string): Feed {
  const compressedData = fromBase64Url(compressed);
  const msgpack = decompress(compressedData);
  const shortKeys = decodeMsgpack(msgpack);
  return shortKeysToFeed(shortKeys);
}

/**
 * Auto-optimize a track to fit within character limit
 * @internal
 */
function autoOptimizeTrack(
  track: Track,
  maxChars: number,
  options: CompressionOptions
): CompressionResult {
  // Define optimization steps (least destructive first)
  const descriptionLengths = [undefined, 150, 100, 60, 40, 25];
  const moderateTitleLengths = [undefined, 50, 40, 30];
  const aggressiveTitleLengths = [20, 15, 10, 5];
  
  const canRemoveDesc = options.preserveDescriptions !== true;
  
  // Phase 1: Moderate truncation
  for (const descLen of descriptionLengths) {
    for (const titleLen of moderateTitleLengths) {
      const result = tryCompressTrack(track, maxChars, {
        maxTitleLength: titleLen,
        maxDescriptionLength: descLen,
        removeFields: options.preserveFields ? undefined : options.removeFields,
      });
      if (result) return result;
    }
  }
  
  // Phase 2: Remove descriptions (if allowed)
  if (canRemoveDesc) {
    for (const titleLen of moderateTitleLengths) {
      const result = tryCompressTrack(track, maxChars, {
        maxTitleLength: titleLen,
        removeDescriptions: true,
        removeFields: options.preserveFields ? undefined : options.removeFields,
      });
      if (result) return result;
    }
  }
  
  // Phase 3: Aggressive title truncation
  const removeDescOptions = canRemoveDesc ? [false, true] : [false];
  for (const removeDesc of removeDescOptions) {
    for (const descLen of descriptionLengths) {
      for (const titleLen of aggressiveTitleLengths) {
        const result = tryCompressTrack(track, maxChars, {
          maxTitleLength: titleLen,
          maxDescriptionLength: removeDesc ? undefined : descLen,
          removeDescriptions: removeDesc,
          removeFields: options.preserveFields ? undefined : options.removeFields,
        });
        if (result) return result;
      }
    }
  }
  
  throw new Error(
    `Cannot compress track to ${maxChars} characters. Try a higher limit or remove constraints.`
  );
}

/**
 * Auto-optimize a feed to fit within character limit
 * @internal
 */
function autoOptimizeFeed(
  feed: Feed,
  maxChars: number,
  options: CompressionOptions
): CompressionResult {
  const fixedTrackCount = options.trackCount;
  const minTrackCount = fixedTrackCount ?? 1;
  const maxTrackCount = fixedTrackCount ?? feed.tracks.length;
  
  let bestResult: CompressionResult | null = null;
  
  // Binary search on track count (if not fixed)
  if (fixedTrackCount === undefined) {
    let left = minTrackCount;
    let right = maxTrackCount;
    
    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      const subset: Feed = { ...feed, tracks: feed.tracks.slice(0, mid) };
      
      const result = tryOptimizeFeed(subset, maxChars, mid, options);
      
      if (result) {
        bestResult = result;
        left = mid + 1; // Try more tracks
      } else {
        right = mid - 1; // Try fewer tracks
      }
    }
  } else {
    // Track count is fixed
    const subset: Feed = { ...feed, tracks: feed.tracks.slice(0, fixedTrackCount) };
    bestResult = tryOptimizeFeed(subset, maxChars, fixedTrackCount, options);
  }
  
  if (!bestResult) {
    throw new Error(
      `Cannot compress feed to ${maxChars} characters. Try a higher limit or remove constraints.`
    );
  }
  
  return bestResult;
}

/**
 * Try optimization strategies for a feed
 * @internal
 */
function tryOptimizeFeed(
  feed: Feed,
  maxChars: number,
  trackCount: number,
  options: CompressionOptions
): CompressionResult | null {
  const descriptionLengths = [undefined, 150, 100, 60, 40, 25, 15];
  const moderateTitleLengths = [undefined, 50, 40, 30];
  const aggressiveTitleLengths = [20, 15, 10, 5, 3];
  
  const canRemoveDesc = options.preserveDescriptions !== true;
  
  // Phase 1: Moderate truncation, no removal
  for (const descLen of descriptionLengths) {
    for (const titleLen of moderateTitleLengths) {
      const result = tryCompressFeed(feed, maxChars, trackCount, {
        maxTitleLength: titleLen,
        maxDescriptionLength: descLen,
        removeFields: options.preserveFields ? undefined : options.removeFields,
        removeImages: options.removeImages,
      });
      if (result) return result;
    }
  }
  
  // Phase 2: Remove descriptions + moderate title truncation
  if (canRemoveDesc) {
    for (const titleLen of moderateTitleLengths) {
      const result = tryCompressFeed(feed, maxChars, trackCount, {
        maxTitleLength: titleLen,
        removeDescriptions: true,
        removeFields: options.preserveFields ? undefined : options.removeFields,
        removeImages: options.removeImages,
      });
      if (result) return result;
    }
  }
  
  // Phase 3: Aggressive title truncation with description removal
  if (canRemoveDesc) {
    for (const titleLen of aggressiveTitleLengths) {
      const result = tryCompressFeed(feed, maxChars, trackCount, {
        maxTitleLength: titleLen,
        removeDescriptions: true,
        removeFields: options.preserveFields ? undefined : options.removeFields,
        removeImages: options.removeImages,
      });
      if (result) return result;
    }
  }
  
  // Phase 4: Ultra-aggressive - aggressive title truncation with/without descriptions
  const removeDescOptions = canRemoveDesc ? [true, false] : [false];
  for (const removeDesc of removeDescOptions) {
    for (const descLen of [25, 15, 10, 5]) {
      for (const titleLen of aggressiveTitleLengths) {
        const result = tryCompressFeed(feed, maxChars, trackCount, {
          maxTitleLength: titleLen,
          maxDescriptionLength: removeDesc ? undefined : descLen,
          removeDescriptions: removeDesc,
          removeFields: options.preserveFields ? undefined : options.removeFields,
          removeImages: options.removeImages,
        });
        if (result) return result;
      }
    }
  }
  
  return null;
}

/**
 * Try compressing a track with specific options
 * @internal
 */
function tryCompressTrack(
  track: Track,
  maxChars: number,
  strategy: CompressionOptions
): CompressionResult | null {
  const reduced = reduceTrack(track, strategy);
  const shortKeys = trackToShortKeys(reduced);
  const msgpack = encodeMsgpack(shortKeys);
  const compressed = compress(msgpack);
  const data = toBase64Url(compressed);
  
  if (data.length <= maxChars) {
    return {
      data,
      length: data.length,
      trackCount: 1,
      strategy,
    };
  }
  
  return null;
}

/**
 * Try compressing a feed with specific options
 * @internal
 */
function tryCompressFeed(
  feed: Feed,
  maxChars: number,
  trackCount: number,
  strategy: CompressionOptions
): CompressionResult | null {
  const reduced = reduceFeed(feed, strategy);
  const shortKeys = feedToShortKeys(reduced);
  const msgpack = encodeMsgpack(shortKeys);
  const compressed = compress(msgpack);
  const data = toBase64Url(compressed);
  
  if (data.length <= maxChars) {
    return {
      data,
      length: data.length,
      trackCount,
      strategy,
    };
  }
  
  return null;
}
