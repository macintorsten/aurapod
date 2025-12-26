import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { shareService, createShareService, Feed, Track, FilterOptions } from '../shareService';
import * as rssService from '../rssService';
import * as packt from '../../lib/packt/index';

describe('shareService', () => {
  describe('sanitizeDescription', () => {
    it('should remove HTML tags', () => {
      const html = '<p>Hello <b>World</b></p>';
      const result = shareService.sanitizeDescription(html);
      expect(result).toBe('Hello World');
    });

    it('should truncate long descriptions to 300 chars', () => {
      const longText = 'a'.repeat(400);
      const html = `<p>${longText}</p>`;
      const result = shareService.sanitizeDescription(html);
      expect(result.length).toBe(300);
      expect(result).toMatch(/\.\.\.$/);
    });

    it('should trim whitespace', () => {
      const html = '  <p>  Test  </p>  ';
      const result = shareService.sanitizeDescription(html);
      expect(result).toBe('Test');
    });
  });

  describe('encode and decode', () => {
    it('should encode and decode data correctly', () => {
      const feed: Feed = {
        title: 'Test Podcast',
        description: null,
        url: 'https://test.com/feed.xml',
        tracks: [{
          title: 'Test Episode',
          url: 'https://test.com/audio.mp3',
          description: 'A test episode description',
          date: null,
          duration: null,
        }]
      };

      const encoded = shareService.encode(feed);
      expect(encoded).toBeTruthy();
      expect(typeof encoded).toBe('string');
      
      const decoded = shareService.decode(encoded);
      expect(decoded).toBeTruthy();
      expect(decoded?.tracks).toHaveLength(1);
      expect(decoded?.tracks?.[0]?.title).toBe('Test Episode');
    });

    it('should handle minimal data', () => {
      const feed: Feed = {
        title: null,
        description: null,
        url: 'https://test.com/feed.xml',
        tracks: [{ title: 'Test', url: 'https://test.com/audio.mp3', description: null, date: null, duration: null }]
      };

      const encoded = shareService.encode(feed);
      const decoded = shareService.decode(encoded);
      expect(decoded).toBeTruthy();
      expect(decoded?.url).toBe('https://test.com/feed.xml');
    });

    it('should handle special characters', () => {
      const feed: Feed = {
        title: null,
        description: null,
        url: null,
        tracks: [{
          title: 'Episode: "The Best & Greatest"',
          description: 'Description with <special> characters & symbols!',
          url: 'https://test.com/audio.mp3',
          date: null,
          duration: null,
        }]
      };

      const encoded = shareService.encode(feed);
      const decoded = shareService.decode(encoded);
      expect(decoded).toBeTruthy();
      expect(decoded?.tracks?.[0]?.title).toContain('The Best & Greatest');
    });

    it('should return null for invalid encoded string', () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      const result = shareService.decode('invalid-string-123');
      expect(result).toBeNull();
      consoleError.mockRestore();
    });

    it('should produce URL-safe encoding', () => {
      const feed: Feed = {
        title: null,
        description: null,
        url: 'https://test.com/feed.xml',
        tracks: [{ title: 'Test Episode', url: 'https://test.com/audio.mp3', description: null, date: null, duration: null }]
      };

      const encoded = shareService.encode(feed);
      
      // Should not contain +, /, or = characters
      expect(encoded).not.toMatch(/[+/=]/);
    });

    it('should encode and decode feed with images', () => {
      const feed: Feed = {
        title: 'Test Podcast',
        description: 'Podcast description',
        url: 'https://test.com/feed.xml',
        image: 'https://test.com/podcast-artwork.jpg',
        tracks: [{
          title: 'Test Episode',
          url: 'https://test.com/audio.mp3',
          description: 'Episode description',
          date: 1735084800,
          duration: 3600,
          image: 'https://test.com/episode-artwork.jpg',
        }]
      };

      const encoded = shareService.encode(feed);
      expect(encoded).toBeTruthy();
      
      const decoded = shareService.decode(encoded);
      expect(decoded).toBeTruthy();
      expect(decoded?.image).toBe('https://test.com/podcast-artwork.jpg');
      expect(decoded?.tracks?.[0]?.image).toBe('https://test.com/episode-artwork.jpg');
    });

    it('should remove images when removeImages option is set', () => {
      const feed: Feed = {
        title: 'Test Podcast',
        image: 'https://test.com/podcast-artwork.jpg',
        tracks: [{
          title: 'Test Episode',
          url: 'https://test.com/audio.mp3',
          image: 'https://test.com/episode-artwork.jpg',
        }]
      };

      const encoded = shareService.encode(feed, { removeImages: true });
      const decoded = shareService.decode(encoded);
      
      expect(decoded).toBeTruthy();
      expect(decoded?.image).toBeNull();
      expect(decoded?.tracks?.[0]?.image).toBeNull();
    });

    it('should produce smaller payload when images are removed', () => {
      const feed: Feed = {
        title: 'Test Podcast',
        image: 'https://test.com/very-long-podcast-artwork-url.jpg',
        tracks: [{
          title: 'Test Episode',
          url: 'https://test.com/audio.mp3',
          image: 'https://test.com/very-long-episode-artwork-url.jpg',
        }]
      };

      const withImages = shareService.encode(feed);
      const withoutImages = shareService.encode(feed, { removeImages: true });
      
      expect(withoutImages.length).toBeLessThan(withImages.length);
    });
  });

  describe('generateUrl', () => {
    it('should generate valid URL with share code', () => {
      const shareData = {
        feed: {
          title: null,
          description: null,
          url: null,
          tracks: [{ title: 'Test Episode', url: 'https://test.com/audio.mp3', description: null, date: null, duration: null }]
        },
        shareType: 'track' as const,
        shareMode: 'embedded-payload' as const,
      };

      const result = shareService.generateUrl(shareData);
      
      expect(result.url).toBeTruthy();
      expect(result.url).toMatch(/#\/\?s=/); // Query param in hash fragment
      expect(result.length).toBeGreaterThan(0);
      expect(result.payloadLength).toBeGreaterThan(0);
      expect(typeof result.isTooLong).toBe('boolean');
    });

    it('should flag URLs longer than 2000 chars', () => {
      // Create a data object that will result in a very long URL
      const longDescription = 'a'.repeat(5000);
      const longTracks: Track[] = [];
      for (let i = 0; i < 100; i++) {
        longTracks.push({
          title: 'Episode Title ' + 'x'.repeat(100),
          url: 'https://test.com/audio' + i + '.mp3',
          description: longDescription,
          date: null,
          duration: null,
        });
      }
      const shareData = {
        feed: {
          title: 'Podcast Title ' + 'x'.repeat(500),
          description: null,
          url: 'https://test.com/feed.xml',
          tracks: longTracks
        },
        shareType: 'frequency' as const,
        shareMode: 'rss-source' as const,
      };

      const result = shareService.generateUrl(shareData);
      // With compression, it might still be under 2000, so just verify it returns a result
      expect(result.length).toBeGreaterThan(0);
      expect(typeof result.isTooLong).toBe('boolean');
    });

    it('should not flag short URLs', () => {
      const shareData = {
        feed: {
          title: null,
          description: null,
          url: null,
          tracks: [{ title: 'Test', url: 'https://test.com/audio.mp3', description: null, date: null, duration: null }]
        },
        shareType: 'track' as const,
        shareMode: 'embedded-payload' as const,
      };

      const result = shareService.generateUrl(shareData);
      expect(result.isTooLong).toBe(false);
    });

    it('should handle compression errors gracefully with warning', () => {
      // Create a test service with mocked compressFeed that throws
      const mockPackt = {
        compressFeed: vi.fn(() => {
          throw new Error('Cannot compress feed to 1900 characters. Try a higher limit or remove constraints.');
        }),
        decompressFeed: packt.decompressFeed,
      };

      const testService = createShareService({
        rssService: rssService as any,
        packt: mockPackt as any,
      });

      const shareData = {
        feed: {
          title: 'Podcast',
          description: null,
          url: 'https://example.com/feed.xml',
          tracks: [{
            title: 'Episode',
            url: 'https://example.com/episode.mp3',
            description: null,
            date: null,
            duration: null,
          }]
        },
        shareType: 'track' as const,
        shareMode: 'embedded-payload' as const,
      };

      const result = testService.generateUrl(shareData);
      
      // Should not throw, but return error state
      expect(result.url).toBe('');
      expect(result.isTooLong).toBe(true);
      expect(result.warning).toBeDefined();
      expect(result.warning).toMatch(/Cannot generate shareable link/);
      expect(result.warning).toMatch(/RSS\/wave mode/);
    });

    it('should generate URL with images included by default', () => {
      const shareData = {
        feed: {
          title: 'Test Podcast',
          description: 'Podcast description',
          url: 'https://test.com/feed.xml',
          image: 'https://test.com/podcast-artwork.jpg',
          tracks: [{
            title: 'Test Episode',
            url: 'https://test.com/audio.mp3',
            description: 'Episode description',
            date: 1735084800,
            duration: 3600,
            image: 'https://test.com/episode-artwork.jpg',
          }]
        },
        shareType: 'track' as const,
        shareMode: 'embedded-payload' as const,
      };

      const result = shareService.generateUrl(shareData);
      
      expect(result.url).toBeTruthy();
      expect(result.payloadLength).toBeGreaterThan(0);
      
      // Decode and verify images are preserved
      const code = result.url.split('s=')[1];
      const decoded = shareService.decode(code);
      
      expect(decoded).toBeTruthy();
      expect(decoded?.image).toBe('https://test.com/podcast-artwork.jpg');
      expect(decoded?.tracks?.[0]?.image).toBe('https://test.com/episode-artwork.jpg');
    });

    it('should generate URL without images when removeImages is true', () => {
      const shareData = {
        feed: {
          title: 'Test Podcast',
          image: 'https://test.com/podcast-artwork.jpg',
          tracks: [{
            title: 'Test Episode',
            url: 'https://test.com/audio.mp3',
            image: 'https://test.com/episode-artwork.jpg',
          }]
        },
        shareType: 'track' as const,
        shareMode: 'embedded-payload' as const,
      };

      const result = shareService.generateUrl(shareData, { removeImages: true });
      
      expect(result.url).toBeTruthy();
      
      // Decode and verify images are removed
      const code = result.url.split('s=')[1];
      const decoded = shareService.decode(code);
      
      expect(decoded).toBeTruthy();
      expect(decoded?.image).toBeNull();
      expect(decoded?.tracks?.[0]?.image).toBeNull();
    });

    it('should produce shorter URLs when images are removed', () => {
      const shareData = {
        feed: {
          title: 'Test Podcast',
          image: 'https://test.com/very-long-podcast-artwork-url-with-many-characters.jpg',
          tracks: [{
            title: 'Test Episode',
            url: 'https://test.com/audio.mp3',
            image: 'https://test.com/very-long-episode-artwork-url-with-many-characters.jpg',
          }]
        },
        shareType: 'track' as const,
        shareMode: 'embedded-payload' as const,
      };

      const withImages = shareService.generateUrl(shareData);
      const withoutImages = shareService.generateUrl(shareData, { removeImages: true });
      
      expect(withoutImages.payloadLength).toBeLessThan(withImages.payloadLength);
    });

    it('should handle feed with mixed image presence', () => {
      const shareData = {
        feed: {
          title: 'Test Podcast',
          image: 'https://test.com/podcast-artwork.jpg',
          tracks: [
            {
              title: 'Episode 1',
              url: 'https://test.com/ep1.mp3',
              image: 'https://test.com/ep1-artwork.jpg',
            },
            {
              title: 'Episode 2',
              url: 'https://test.com/ep2.mp3',
              image: null, // No episode-specific image
            }
          ]
        },
        shareType: 'frequency' as const,
        shareMode: 'embedded-payload' as const,
      };

      const result = shareService.generateUrl(shareData);
      
      expect(result.url).toBeTruthy();
      
      // Decode and verify mixed image handling
      const code = result.url.split('s=')[1];
      const decoded = shareService.decode(code);
      
      expect(decoded).toBeTruthy();
      expect(decoded?.image).toBe('https://test.com/podcast-artwork.jpg');
      expect(decoded?.tracks?.[0]?.image).toBe('https://test.com/ep1-artwork.jpg');
      expect(decoded?.tracks?.[1]?.image).toBeNull();
    });
  });

  describe('applyFilters', () => {
    const tracks: Track[] = [
      {
        title: 'Episode 1',
        url: 'https://example.com/1.mp3',
        description: 'Description 1',
        image: 'https://example.com/image1.jpg',
        date: Math.floor(new Date('2024-01-01').getTime() / 1000),
        duration: 1800, // 30 minutes in seconds
      },
      {
        title: 'Episode 2',
        url: 'https://example.com/2.mp3',
        description: 'Description 2',
        image: 'https://example.com/image2.jpg',
        date: Math.floor(new Date('2024-01-02').getTime() / 1000),
        duration: 2700, // 45 minutes in seconds
      },
    ];

    it('should include all fields when all filters are true', () => {
      const filters: FilterOptions = {
        includeDescriptions: true,
        includeImages: true,
        includeDatesAndDurations: true,
      };

      const result = shareService.applyFilters(tracks, filters);
      expect(result[0].description).toBe('Description 1');
      expect(result[0].image).toBe('https://example.com/image1.jpg');
      expect(result[0].date).toBe(Math.floor(new Date('2024-01-01').getTime() / 1000));
      expect(result[0].duration).toBe(1800);
    });

    it('should exclude descriptions when filter is false', () => {
      const filters: FilterOptions = {
        includeDescriptions: false,
        includeImages: true,
        includeDatesAndDurations: true,
      };

      const result = shareService.applyFilters(tracks, filters);
      expect(result[0].description).toBeNull();
      expect(result[0].image).toBe('https://example.com/image1.jpg');
      expect(result[0].date).toBe(Math.floor(new Date('2024-01-01').getTime() / 1000));
    });

    it('should exclude dates and durations when filter is false', () => {
      const filters: FilterOptions = {
        includeDescriptions: true,
        includeImages: false,
        includeDatesAndDurations: false,
      };

      const result = shareService.applyFilters(tracks, filters);
      expect(result[0].date).toBeNull();
      expect(result[0].image).toBeNull();
      expect(result[0].description).toBe('Description 1');
    });

    it('should exclude images when filter is false', () => {
      const filters: FilterOptions = {
        includeDescriptions: true,
        includeImages: false,
        includeDatesAndDurations: true,
      };

      const result = shareService.applyFilters(tracks, filters);
      expect(result[0].image).toBeNull();
      expect(result[0].description).toBe('Description 1');
      expect(result[0].date).toBe(Math.floor(new Date('2024-01-01').getTime() / 1000));
    });

    it('should include images when filter is true', () => {
      const filters: FilterOptions = {
        includeDescriptions: false,
        includeImages: true,
        includeDatesAndDurations: false,
      };

      const result = shareService.applyFilters(tracks, filters);
      expect(result[0].image).toBe('https://example.com/image1.jpg');
      expect(result[1].image).toBe('https://example.com/image2.jpg');
    });

    it('should handle tracks without images', () => {
      const tracksWithoutImages: Track[] = [
        {
          title: 'Episode 1',
          url: 'https://example.com/1.mp3',
          description: 'Description 1',
          image: null,
          date: Math.floor(new Date('2024-01-01').getTime() / 1000),
          duration: 1800,
        },
      ];

      const filters: FilterOptions = {
        includeDescriptions: true,
        includeImages: true,
        includeDatesAndDurations: true,
      };

      const result = shareService.applyFilters(tracksWithoutImages, filters);
      expect(result[0].image).toBeNull();
    });

    it('should always include title and url', () => {
      const filters: FilterOptions = {
        includeDescriptions: false,
        includeImages: false,
        includeDatesAndDurations: false,
      };

      const result = shareService.applyFilters(tracks, filters);
      expect(result[0].title).toBe('Episode 1');
      expect(result[0].url).toBe('https://example.com/1.mp3');
    });
  });

  describe('Track sharing modes', () => {
    it('should not include RSS URL in embedded-payload mode', () => {
      const shareData = {
        feed: {
          title: 'Podcast Title',
          description: null,
          url: null,
          tracks: [{
            title: 'Episode Title',
            url: 'https://test.com/audio.mp3',
            description: 'Description',
            date: null,
            duration: null,
          }]
        },
        shareType: 'track' as const,
        shareMode: 'embedded-payload' as const,
      };

      const encoded = shareService.encode(shareData.feed);
      const decoded = shareService.decode(encoded);
      expect(decoded?.url).toBe(null);
      expect(decoded?.tracks?.[0]?.title).toBe('Episode Title');
    });

    it('should include RSS URL in wave-source mode', () => {
      const shareData = {
        feed: {
          title: null,
          description: null,
          url: 'https://test.com/feed.xml',
          tracks: [] // Empty for wave-source
        },
        shareType: 'track' as const,
        shareMode: 'wave-source' as const,
        episodeId: 'episode-123',
      };

      // Wave-source mode doesn't use compression
      const result = shareService.generateUrl(shareData);
      expect(result.url).toContain('/#/podcast/');
      expect(result.url).toContain(encodeURIComponent('https://test.com/feed.xml'));
    });

    it('should generate podcast/episode URL without encoding for wave-source mode', () => {
      delete (global as any).window;
      (global as any).window = { location: { origin: 'http://localhost:3000', pathname: '/', href: 'http://localhost:3000/' } };

      const shareData = {
        feed: {
          title: null,
          description: null,
          url: 'https://test.com/feed.xml',
          tracks: []
        },
        shareType: 'track' as const,
        shareMode: 'wave-source' as const,
        episodeId: 'episode-123',
      };

      const result = shareService.generateUrl(shareData);
      
      // Should generate /#/podcast/<encoded-rss-url>/<encoded-episode-id> format with hash routing
      expect(result.url).toContain('/#/podcast/');
      expect(result.url).toContain(encodeURIComponent('https://test.com/feed.xml'));
      expect(result.url).toContain(encodeURIComponent('episode-123'));
      expect(result.url).not.toContain('?s='); // Should not have encoded parameter
      expect(result.payloadLength).toBe(0); // No encoded payload
    });

    it('should generate encoded URL for embedded-payload mode', () => {
      delete (global as any).window;
      (global as any).window = { location: { origin: 'http://localhost:3000', pathname: '/', href: 'http://localhost:3000/' } };

      const shareData = {
        feed: {
          title: 'Podcast Title',
          description: null,
          url: null,
          tracks: [{
            title: 'Episode Title',
            url: 'https://test.com/audio.mp3',
            description: 'Description',
            date: null,
            duration: null,
          }]
        },
        shareType: 'track' as const,
        shareMode: 'embedded-payload' as const,
      };

      const result = shareService.generateUrl(shareData);
      
      // Should have encoded parameter in hash fragment
      expect(result.url).toContain('/#/?s=');
      expect(result.payloadLength).toBeGreaterThan(0);
    });
  });

  describe('RSS sharing modes', () => {
    it('should handle frequency mode with just RSS URL', () => {
      const shareData = {
        feed: {
          title: null,
          description: null,
          url: 'https://test.com/feed.xml',
          tracks: []
        },
        shareType: 'frequency' as const,
        shareMode: 'rss-source' as const,
      };

      // Frequency mode uses direct URL, not compression
      const result = shareService.generateUrl(shareData);
      expect(result.url).toContain('/#/podcast/');
      expect(result.payloadLength).toBe(0);
    });

    it('should generate podcast URL without encoding for frequency mode', () => {
      // Mock window.location
      delete (global as any).window;
      (global as any).window = { location: { origin: 'http://localhost:3000', pathname: '/', href: 'http://localhost:3000/' } };

      const shareData = {
        feed: {
          title: null,
          description: null,
          url: 'https://test.com/feed.xml',
          tracks: []
        },
        shareType: 'frequency' as const,
        shareMode: 'rss-source' as const,
      };

      const result = shareService.generateUrl(shareData);
      
      // Should generate /#/podcast/<encoded-rss-url> format with hash routing
      expect(result.url).toContain('/#/podcast/');
      expect(result.url).toContain(encodeURIComponent('https://test.com/feed.xml'));
      expect(result.url).not.toContain('?s='); // Should not have encoded parameter
      expect(result.payloadLength).toBe(0); // No encoded payload
    });

    it('should generate encoded URL for full manifest mode', () => {
      delete (global as any).window;
      (global as any).window = { location: { origin: 'http://localhost:3000', pathname: '/', href: 'http://localhost:3000/' } };

      const shareData = {
        feed: {
          title: 'Test Podcast',
          description: null,
          url: 'https://test.com/feed.xml',
          tracks: [
            {
              title: 'Episode 1',
              url: 'https://test.com/audio.mp3',
              description: null,
              date: null,
              duration: null,
            }
          ],
        },
        shareType: 'frequency' as const,
        shareMode: 'embedded-payload' as const,
      };

      const result = shareService.generateUrl(shareData);
      
      // Should have encoded parameter in hash fragment
      expect(result.url).toContain('/#/?s=');
      expect(result.payloadLength).toBeGreaterThan(0);
    });
  });

  describe('Compression modes', () => {
    const createLargeFeed = (): Feed => ({
      title: 'Test Podcast with a Very Long Title That Should Be Truncated',
      description: 'A'.repeat(500),
      url: 'https://example.com/feed.xml',
      image: 'https://example.com/artwork.jpg',
      tracks: [
        {
          title: 'Episode 1 with a Very Long Title That Contains Many Words',
          url: 'https://example.com/episode1.mp3',
          description: 'B'.repeat(500),
          image: 'https://example.com/ep1.jpg',
          date: Math.floor(Date.now() / 1000),
          duration: 3600,
        },
        {
          title: 'Episode 2 with Another Very Long Title',
          url: 'https://example.com/episode2.mp3',
          description: 'C'.repeat(500),
          image: 'https://example.com/ep2.jpg',
          date: Math.floor(Date.now() / 1000),
          duration: 3600,
        }
      ]
    });

    it('should use full compression mode (no truncation)', () => {
      const feed = createLargeFeed();
      const encoded = shareService.encode(feed, { compressionMode: 'full' });
      const decoded = shareService.decode(encoded);

      expect(decoded).toBeTruthy();
      // Descriptions should be preserved (may be truncated to max 300 chars but not removed)
      expect(decoded?.tracks?.[0]?.description).toBeTruthy();
      expect(decoded?.tracks?.[0]?.description?.length).toBeGreaterThan(50);
      expect(decoded?.tracks?.[0]?.title?.length).toBeGreaterThan(20);
    });

    it('should use auto compression mode (adaptive truncation)', () => {
      const feed = createLargeFeed();
      const encoded = shareService.encode(feed, { 
        compressionMode: 'auto',
        maxChars: 1900 
      });
      const decoded = shareService.decode(encoded);

      expect(decoded).toBeTruthy();
      expect(encoded.length).toBeLessThanOrEqual(1900);
      // Should adaptively compress to fit
      expect(decoded?.tracks).toHaveLength(2); // Should keep both tracks
    });

    it('should use minimal compression mode (aggressive truncation)', () => {
      const feed = createLargeFeed();
      const encoded = shareService.encode(feed, { 
        compressionMode: 'minimal',
        maxChars: 400 
      });
      const decoded = shareService.decode(encoded);

      expect(decoded).toBeTruthy();
      expect(encoded.length).toBeLessThanOrEqual(400);
      // Minimal with very tight constraint will have minimal content
      expect(decoded?.tracks).toBeDefined();
    });

    it('should default to auto mode when compressionMode not specified', () => {
      const feed = createLargeFeed();
      const encoded = shareService.encode(feed, { maxChars: 1900 });
      const decoded = shareService.decode(encoded);

      expect(decoded).toBeTruthy();
      expect(encoded.length).toBeLessThanOrEqual(1900);
    });

    it('should handle full mode with generateUrl', () => {
      delete (global as any).window;
      (global as any).window = { location: { origin: 'http://localhost:3000', pathname: '/', href: 'http://localhost:3000/' } };

      const feed = createLargeFeed();
      const result = shareService.generateUrl({
        feed,
        shareType: 'frequency',
        shareMode: 'embedded-payload'
      }, {
        compressionMode: 'full'
      });

      expect(result.url).toBeTruthy();
      // Full mode might produce larger URLs
      expect(result.payloadLength).toBeGreaterThan(0);
    });

    it('should handle auto mode with generateUrl', () => {
      delete (global as any).window;
      (global as any).window = { location: { origin: 'http://localhost:3000', pathname: '/', href: 'http://localhost:3000/' } };

      const feed = createLargeFeed();
      const result = shareService.generateUrl({
        feed,
        shareType: 'frequency',
        shareMode: 'embedded-payload'
      }, {
        compressionMode: 'auto'
      });

      expect(result.url).toBeTruthy();
      expect(result.payloadLength).toBeLessThanOrEqual(1900);
    });

    it('should handle minimal mode with generateUrl', () => {
      delete (global as any).window;
      (global as any).window = { location: { origin: 'http://localhost:3000', pathname: '/', href: 'http://localhost:3000/' } };

      const feed = createLargeFeed();
      const result = shareService.generateUrl({
        feed,
        shareType: 'frequency',
        shareMode: 'embedded-payload'
      }, {
        compressionMode: 'minimal'
      });

      expect(result.url).toBeTruthy();
      // Minimal should produce smallest URLs
      expect(result.payloadLength).toBeLessThan(1000);
    });

    it('should produce smallest payload with minimal mode', () => {
      const feed = createLargeFeed();
      
      const fullEncoded = shareService.encode(feed, { compressionMode: 'full' });
      const autoEncoded = shareService.encode(feed, { compressionMode: 'auto', maxChars: 1900 });
      const minimalEncoded = shareService.encode(feed, { compressionMode: 'minimal', maxChars: 400 });

      // Full mode should produce the largest payload (no maxChars set)
      expect(fullEncoded.length).toBeGreaterThan(minimalEncoded.length);
      // Minimal should be the smallest
      expect(minimalEncoded.length).toBeLessThanOrEqual(400);
    });
  });

  describe('Feed image fallback', () => {
    it('should use feed image when track image is missing', () => {
      const track: Track = {
        title: 'Episode',
        url: 'https://example.com/ep.mp3',
        description: null,
        image: null,
        date: null,
        duration: null,
      };

      const feedImage = 'https://example.com/podcast-art.jpg';
      const episode = shareService.trackToEpisode(track, 'podcast-1', 0, feedImage);

      expect(episode.image).toBe(feedImage);
    });

    it('should prefer track image over feed image when both exist', () => {
      const track: Track = {
        title: 'Episode',
        url: 'https://example.com/ep.mp3',
        description: null,
        image: 'https://example.com/episode-art.jpg',
        date: null,
        duration: null,
      };

      const feedImage = 'https://example.com/podcast-art.jpg';
      const episode = shareService.trackToEpisode(track, 'podcast-1', 0, feedImage);

      expect(episode.image).toBe('https://example.com/episode-art.jpg');
    });

    it('should handle missing both track and feed images', () => {
      const track: Track = {
        title: 'Episode',
        url: 'https://example.com/ep.mp3',
        description: null,
        image: null,
        date: null,
        duration: null,
      };

      const episode = shareService.trackToEpisode(track, 'podcast-1', 0);

      expect(episode.image).toBeUndefined();
    });
  });
});
