import { describe, it, expect } from 'vitest';
import {
  trackToShortKeys,
  shortKeysToTrack,
  feedToShortKeys,
  shortKeysToFeed,
  encodeMsgpack,
  decodeMsgpack,
} from './encoder';
import { Track, Feed, TRACK_KEYS, FEED_KEYS } from './types';

describe('encoder', () => {
  describe('track short key conversion', () => {
    it('should convert track to short keys', () => {
      const track: Track = {
        title: 'Episode Title',
        url: 'https://example.com/audio.mp3',
        date: 1735084800,
        duration: 3600,
        description: 'Episode description',
      };
      
      const result = trackToShortKeys(track);
      
      expect(result[TRACK_KEYS.title]).toBe('Episode Title');
      expect(result[TRACK_KEYS.url]).toBe('https://example.com/audio.mp3');
      expect(result[TRACK_KEYS.date]).toBe(1735084800);
      expect(result[TRACK_KEYS.duration]).toBe(3600);
      expect(result[TRACK_KEYS.description]).toBe('Episode description');
    });
    
    it('should omit null and undefined values', () => {
      const track: Track = {
        title: 'Episode Title',
        url: null,
        description: undefined,
      };
      
      const result = trackToShortKeys(track);
      
      expect(result[TRACK_KEYS.title]).toBe('Episode Title');
      expect(result).not.toHaveProperty(TRACK_KEYS.url);
      expect(result).not.toHaveProperty(TRACK_KEYS.description);
    });
    
    it('should convert short keys back to track', () => {
      const shortKeys = {
        [TRACK_KEYS.title]: 'Episode Title',
        [TRACK_KEYS.url]: 'https://example.com/audio.mp3',
        [TRACK_KEYS.date]: 1735084800,
      };
      
      const result = shortKeysToTrack(shortKeys);
      
      expect(result.title).toBe('Episode Title');
      expect(result.url).toBe('https://example.com/audio.mp3');
      expect(result.date).toBe(1735084800);
      expect(result.duration).toBeNull();
      expect(result.description).toBeNull();
    });
    
    it('should handle roundtrip conversion', () => {
      const original: Track = {
        title: 'Test Episode',
        url: 'https://example.com/test.mp3',
        date: 1735084800,
        duration: 1800,
        description: 'Test description',
        image: null,
      };
      
      const shortKeys = trackToShortKeys(original);
      const restored = shortKeysToTrack(shortKeys);
      
      expect(restored).toEqual(original);
    });
  });
  
  describe('feed short key conversion', () => {
    it('should convert feed to short keys', () => {
      const feed: Feed = {
        title: 'Podcast Title',
        description: 'Podcast Description',
        url: 'https://example.com',
        tracks: [
          { title: 'Episode 1', url: 'https://example.com/ep1.mp3' },
          { title: 'Episode 2', url: 'https://example.com/ep2.mp3' },
        ],
      };
      
      const result = feedToShortKeys(feed);
      
      expect(result[FEED_KEYS.title]).toBe('Podcast Title');
      expect(result[FEED_KEYS.description]).toBe('Podcast Description');
      expect(result[FEED_KEYS.url]).toBe('https://example.com');
      expect(result[FEED_KEYS.tracks]).toHaveLength(2);
      expect(result[FEED_KEYS.tracks][0][TRACK_KEYS.title]).toBe('Episode 1');
    });
    
    it('should convert short keys back to feed', () => {
      const shortKeys = {
        [FEED_KEYS.title]: 'Podcast Title',
        [FEED_KEYS.tracks]: [
          { [TRACK_KEYS.title]: 'Episode 1' },
          { [TRACK_KEYS.title]: 'Episode 2' },
        ],
      };
      
      const result = shortKeysToFeed(shortKeys);
      
      expect(result.title).toBe('Podcast Title');
      expect(result.tracks).toHaveLength(2);
      expect(result.tracks[0].title).toBe('Episode 1');
      expect(result.tracks[1].title).toBe('Episode 2');
    });
    
    it('should handle roundtrip conversion', () => {
      const original: Feed = {
        title: 'Test Podcast',
        description: 'Test Description',
        url: 'https://test.com',
        image: null,
        tracks: [
          {
            title: 'Episode 1',
            url: 'https://test.com/ep1.mp3',
            date: 1735084800,
            duration: 3600,
            description: null,
            image: null,
          },
        ],
      };
      
      const shortKeys = feedToShortKeys(original);
      const restored = shortKeysToFeed(shortKeys);
      
      expect(restored).toEqual(original);
    });
  });
  
  describe('msgpack encoding', () => {
    it('should encode and decode data', () => {
      const data = {
        string: 'hello',
        number: 42,
        boolean: true,
        array: [1, 2, 3],
        object: { nested: 'value' },
      };
      
      const encoded = encodeMsgpack(data);
      const decoded = decodeMsgpack(encoded);
      
      expect(decoded).toEqual(data);
    });
    
    it('should produce binary data', () => {
      const data = { test: 'value' };
      const encoded = encodeMsgpack(data);
      
      expect(encoded).toBeInstanceOf(Uint8Array);
      expect(encoded.length).toBeGreaterThan(0);
    });
    
    it('should be more compact than JSON for typical data', () => {
      const data = {
        items: Array(10).fill(null).map((_, i) => ({
          id: i,
          title: `Item ${i}`,
          value: i * 100,
        })),
      };
      
      const msgpackSize = encodeMsgpack(data).length;
      const jsonSize = JSON.stringify(data).length;
      
      expect(msgpackSize).toBeLessThan(jsonSize);
    });
  });
});
