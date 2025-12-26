import { Track, Feed, CompressionOptions } from './types';

/**
 * Truncate a string to a maximum length, adding ellipsis (…) if truncated
 */
function truncateString(str: string | null | undefined, maxLength: number): string | null | undefined {
  if (!str) return str;
  if (str.length <= maxLength) return str;
  // Use Unicode ellipsis character (…) which is one character
  if (maxLength < 1) return str.substring(0, maxLength);
  return str.substring(0, maxLength - 1) + '…';
}

/**
 * Apply compression options to a track (truncation and removal)
 */
export function reduceTrack(track: Track, options: CompressionOptions = {}): Track {
  const result: Track = { ...track };
  
  // Apply title truncation
  if (options.maxTitleLength !== undefined) {
    result.title = truncateString(result.title, options.maxTitleLength);
  }
  
  // Apply description truncation
  if (options.maxDescriptionLength !== undefined) {
    result.description = truncateString(result.description, options.maxDescriptionLength);
  }
  
  // Remove descriptions if requested
  if (options.removeDescriptions) {
    result.description = null;
  }
  
  // Remove images if requested
  if (options.removeImages) {
    result.image = null;
  }
  
  // Remove specific fields if requested
  if (options.removeFields && options.removeFields.length > 0) {
    for (const field of options.removeFields) {
      if (field in result) {
        (result as any)[field] = null;
      }
    }
  }
  
  return result;
}

/**
 * Apply compression options to a feed (including feed-level metadata)
 */
export function reduceFeed(feed: Feed, options: CompressionOptions = {}): Feed {
  const result: Feed = {
    ...feed,
    tracks: feed.tracks.map(track => reduceTrack(track, options)),
  };
  
  // Apply feed-level truncation if specified
  if (options.maxTitleLength !== undefined) {
    result.title = truncateString(result.title, options.maxTitleLength);
  }
  
  if (options.maxDescriptionLength !== undefined) {
    result.description = truncateString(result.description, options.maxDescriptionLength);
  }
  
  // Remove feed-level descriptions if requested
  if (options.removeDescriptions) {
    result.description = null;
  }
  
  // Remove feed-level images if requested
  if (options.removeImages) {
    result.image = null;
  }
  
  return result;
}
