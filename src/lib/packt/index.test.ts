import { describe, it, expect } from 'vitest';
import {
  compressTrack,
  decompressTrack,
  compressFeed,
  decompressFeed,
} from './index';
import { Track, Feed } from './types';

describe('index (main API)', () => {
  describe('compressTrack and decompressTrack', () => {
    it('should compress and decompress track', () => {
      const track: Track = {
        title: 'Episode Title',
        url: 'https://example.com/audio.mp3',
        date: 1735084800,
        duration: 3600,
        description: 'Episode description',
        image: null,
      };
      
      const result = compressTrack(track);
      const decompressed = decompressTrack(result.data);
      
      expect(decompressed).toEqual(track);
      expect(result.length).toBe(result.data.length);
      expect(result.trackCount).toBe(1);
    });
    
    it('should produce shorter output with maxTitleLength', () => {
      const track: Track = {
        title: 'This is a very long episode title that should be truncated',
        description: 'This is a very long description that should also be truncated',
      };
      
      const full = compressTrack(track);
      const truncated = compressTrack(track, {
        maxTitleLength: 10,
        maxDescriptionLength: 10,
      });
      
      expect(truncated.length).toBeLessThan(full.length);
    });
    
    it('should produce shorter output without descriptions', () => {
      const track: Track = {
        title: 'Episode Title',
        description: 'Long description that takes up space',
      };
      
      const full = compressTrack(track);
      const stripped = compressTrack(track, { removeDescriptions: true });
      
      expect(stripped.length).toBeLessThan(full.length);
      
      const decompressed = decompressTrack(stripped.data);
      expect(decompressed.title).toBe('Episode Title');
      expect(decompressed.description).toBeNull();
    });
    
    it('should auto-optimize with maxChars', () => {
      const track: Track = {
        title: 'Episode with a very long title that needs to be optimized',
        description: 'This is a very long description that might need truncation or removal',
        url: 'https://example.com/very/long/path/to/audio/file.mp3',
      };
      
      const result = compressTrack(track, { maxChars: 200 });
      
      expect(result.length).toBeLessThanOrEqual(200);
      expect(result.strategy).toBeDefined();
      
      const decompressed = decompressTrack(result.data);
      expect(decompressed.title).toBeDefined();
    });
    
    it('should respect preserveDescriptions constraint', () => {
      const track: Track = {
        title: 'Episode Title',
        description: 'Episode description that must not be removed',
      };
      
      const result = compressTrack(track, {
        maxChars: 300,
        preserveDescriptions: true,
      });
      
      const decompressed = decompressTrack(result.data);
      expect(decompressed.description).not.toBeNull();
    });
  });
  
  describe('compressFeed and decompressFeed', () => {
    it('should compress and decompress feed', () => {
      const feed: Feed = {
        title: 'Podcast Title',
        description: 'Podcast Description',
        url: 'https://example.com',
        image: null,
        tracks: [
          {
            title: 'Episode 1',
            url: 'https://example.com/ep1.mp3',
            date: 1735084800,
            duration: null,
            description: null,
            image: null,
          },
          {
            title: 'Episode 2',
            url: 'https://example.com/ep2.mp3',
            date: 1735171200,
            duration: null,
            description: null,
            image: null,
          },
        ],
      };
      
      const result = compressFeed(feed);
      const decompressed = decompressFeed(result.data);
      
      expect(decompressed).toEqual(feed);
      expect(result.trackCount).toBe(2);
    });
    
    it('should apply compression options to all tracks', () => {
      const feed: Feed = {
        title: 'Podcast',
        tracks: [
          { title: 'Very long episode title 1', description: 'Description 1' },
          { title: 'Very long episode title 2', description: 'Description 2' },
        ],
      };
      
      const result = compressFeed(feed, {
        maxTitleLength: 10,
        removeDescriptions: true,
      });
      
      const decompressed = decompressFeed(result.data);
      
      expect(decompressed.tracks[0].title).toBe('Very long…');
      expect(decompressed.tracks[0].description).toBeNull();
      expect(decompressed.tracks[1].title).toBe('Very long…');
      expect(decompressed.tracks[1].description).toBeNull();
    });
    
    it('should auto-optimize to fit within maxChars', () => {
      const feed: Feed = {
        title: 'Test Podcast',
        tracks: Array(50).fill(null).map((_, i) => ({
          title: `Episode ${i + 1} with a descriptive title`,
          url: `https://example.com/episodes/ep${i + 1}.mp3`,
          description: `This is the description for episode ${i + 1}`,
          date: 1735084800 + i * 86400,
        })),
      };
      
      const result = compressFeed(feed, { maxChars: 1900 });
      
      expect(result.length).toBeLessThanOrEqual(1900);
      expect(result.trackCount).toBeGreaterThan(0);
      expect(result.strategy).toBeDefined();
      
      // Verify we can decompress
      const decompressed = decompressFeed(result.data);
      expect(decompressed.tracks.length).toBe(result.trackCount);
    });
    
    it('should respect trackCount constraint', () => {
      const feed: Feed = {
        title: 'Test Podcast',
        tracks: Array(100).fill(null).map((_, i) => ({
          title: `Episode ${i + 1}`,
          url: `https://example.com/ep${i + 1}.mp3`,
        })),
      };
      
      const result = compressFeed(feed, { maxChars: 1900, trackCount: 10 });
      
      expect(result.trackCount).toBe(10);
      
      const decompressed = decompressFeed(result.data);
      expect(decompressed.tracks.length).toBe(10);
    });
    
    it('should respect preserveDescriptions constraint', () => {
      const feed: Feed = {
        title: 'Test Podcast',
        tracks: Array(20).fill(null).map((_, i) => ({
          title: `Episode ${i + 1}`,
          description: 'Episode description that must be kept',
        })),
      };
      
      const result = compressFeed(feed, {
        maxChars: 1900,
        preserveDescriptions: true,
      });
      
      const decompressed = decompressFeed(result.data);
      
      // All tracks should have descriptions
      for (const track of decompressed.tracks) {
        expect(track.description).not.toBeNull();
      }
    });
    
    it('should use binary search to maximize track count', () => {
      const feed: Feed = {
        title: 'Test Podcast',
        tracks: Array(100).fill(null).map((_, i) => ({
          title: `Ep ${i + 1}`,
          url: `https://example.com/ep${i + 1}.mp3`,
        })),
      };
      
      const result = compressFeed(feed, { maxChars: 1900 });
      
      // Should fit many episodes with such short data
      expect(result.trackCount).toBeGreaterThan(10);
      expect(result.length).toBeLessThanOrEqual(1900);
    });
    
    it('should throw error if impossible to meet limit', () => {
      const feed: Feed = {
        title: 'Test Podcast',
        tracks: [{
          title: 'Episode 1',
          url: 'https://example.com/ep1.mp3?with=very&long=query&parameters=' + 'x'.repeat(5000),
        }],
      };
      
      expect(() => {
        compressFeed(feed, {
          maxChars: 50,  // Way too small even for minimal data
          trackCount: 1,
        });
      }).toThrow(/Cannot compress feed/);
    });
    
    it('should handle realistic feed that is challenging to compress to 1900 chars', () => {
      // Create a feed with realistic podcast data
      const feed: Feed = {
        title: 'The Daily Tech Podcast: Technology News and Interviews',
        description: 'A comprehensive podcast covering the latest in technology, software development, artificial intelligence, and digital innovation.',
        url: 'https://example.com/podcast/daily-tech-show',
        tracks: Array(30).fill(null).map((_, i) => ({
          title: `Episode ${i + 1}: Deep Dive into Modern Software Architecture Patterns and Best Practices`,
          url: `https://cdn.example.com/podcasts/daily-tech-show/2024/episode-${String(i + 1).padStart(3, '0')}-audio-file.mp3`,
          description: `In this episode, we explore advanced software architecture patterns including microservices, event-driven design, and domain-driven development. Our guest expert shares insights from years of industry experience.`,
          date: 1735084800 + i * 86400,
          duration: 3600 + i * 60,
        })),
      };
      
      // This should succeed without throwing, even if it has to be aggressive
      const result = compressFeed(feed, { maxChars: 1900 });
      
      expect(result.length).toBeLessThanOrEqual(1900);
      expect(result.trackCount).toBeGreaterThan(0);
      
      // Verify we can decompress
      const decompressed = decompressFeed(result.data);
      expect(decompressed.tracks.length).toBe(result.trackCount);
      expect(decompressed.tracks[0].title).toBeDefined();
    });
    
    it('should gracefully reduce track count when individual tracks are too large', () => {
      // Create a feed where even 1 track is hard to fit in 1900 chars
      const feed: Feed = {
        title: 'Podcast with Very Long Metadata',
        description: 'Description '.repeat(100),
        url: 'https://example.com/very-long-podcast-url-path/' + 'x'.repeat(100),
        tracks: [{
          title: 'Episode Title '.repeat(50),
          url: 'https://example.com/episode-url/' + 'x'.repeat(500),
          description: 'Episode description '.repeat(100),
          date: 1735084800,
          duration: 3600,
        }],
      };
      
      // Should handle this by aggressive truncation
      const result = compressFeed(feed, { maxChars: 1900 });
      
      expect(result.length).toBeLessThanOrEqual(1900);
      expect(result.trackCount).toBeGreaterThan(0);
      
      // Verify we can decompress (content will be truncated)
      const decompressed = decompressFeed(result.data);
      expect(decompressed.tracks.length).toBeGreaterThan(0);
    });
  });
});
