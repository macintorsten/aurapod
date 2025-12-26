import { encode, decode } from '@msgpack/msgpack';
import { Track, Feed, TRACK_KEYS, FEED_KEYS } from './types';

/**
 * Convert a Track to short-key dictionary format
 * @param track - Track with full property names
 * @returns Object with short keys
 */
export function trackToShortKeys(track: Track): Record<string, any> {
  const result: Record<string, any> = {};
  
  if (track.title !== undefined && track.title !== null) {
    result[TRACK_KEYS.title] = track.title;
  }
  if (track.url !== undefined && track.url !== null) {
    result[TRACK_KEYS.url] = track.url;
  }
  if (track.date !== undefined && track.date !== null) {
    result[TRACK_KEYS.date] = track.date;
  }
  if (track.duration !== undefined && track.duration !== null) {
    result[TRACK_KEYS.duration] = track.duration;
  }
  if (track.description !== undefined && track.description !== null) {
    result[TRACK_KEYS.description] = track.description;
  }
  if (track.image !== undefined && track.image !== null) {
    result[TRACK_KEYS.image] = track.image;
  }
  
  return result;
}

/**
 * Convert short-key dictionary back to Track
 * @param obj - Object with short keys
 * @returns Track with full property names
 */
export function shortKeysToTrack(obj: Record<string, any>): Track {
  return {
    title: obj[TRACK_KEYS.title] ?? null,
    url: obj[TRACK_KEYS.url] ?? null,
    date: obj[TRACK_KEYS.date] ?? null,
    duration: obj[TRACK_KEYS.duration] ?? null,
    description: obj[TRACK_KEYS.description] ?? null,
    image: obj[TRACK_KEYS.image] ?? null,
  };
}

/**
 * Convert a Feed to short-key dictionary format
 * @param feed - Feed with full property names
 * @returns Object with short keys
 */
export function feedToShortKeys(feed: Feed): Record<string, any> {
  const result: Record<string, any> = {};
  
  if (feed.title !== undefined && feed.title !== null) {
    result[FEED_KEYS.title] = feed.title;
  }
  if (feed.description !== undefined && feed.description !== null) {
    result[FEED_KEYS.description] = feed.description;
  }
  if (feed.url !== undefined && feed.url !== null) {
    result[FEED_KEYS.url] = feed.url;
  }
  if (feed.image !== undefined && feed.image !== null) {
    result[FEED_KEYS.image] = feed.image;
  }
  
  result[FEED_KEYS.tracks] = feed.tracks.map(trackToShortKeys);
  
  return result;
}

/**
 * Convert short-key dictionary back to Feed
 * @param obj - Object with short keys
 * @returns Feed with full property names
 */
export function shortKeysToFeed(obj: Record<string, any>): Feed {
  return {
    title: obj[FEED_KEYS.title] ?? null,
    description: obj[FEED_KEYS.description] ?? null,
    url: obj[FEED_KEYS.url] ?? null,
    image: obj[FEED_KEYS.image] ?? null,
    tracks: (obj[FEED_KEYS.tracks] || []).map(shortKeysToTrack),
  };
}

/**
 * Encode data to MessagePack binary format
 * @param data - Data to encode
 * @returns Binary encoded data
 */
export function encodeMsgpack(data: any): Uint8Array {
  return encode(data);
}

/**
 * Decode MessagePack binary format back to data
 * @param data - Binary data to decode
 * @returns Decoded data
 */
export function decodeMsgpack(data: Uint8Array): any {
  return decode(data);
}
