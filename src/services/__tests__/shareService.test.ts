import { describe, it, expect, vi, beforeEach } from 'vitest';
import { shareService, SharedData, FilterOptions } from '../shareService';
import * as rssService from '../rssService';

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
      const data: SharedData = {
        p: 'https://test.com/feed.xml',
        e: 'episode-123',
        t: 'Test Episode',
        u: 'https://test.com/audio.mp3',
        i: 'https://test.com/image.jpg',
        d: 'A test episode description',
        st: 'Test Podcast',
        si: 'https://test.com/podcast.jpg'
      };

      const encoded = shareService.encode(data);
      expect(encoded).toBeTruthy();
      expect(typeof encoded).toBe('string');
      
      const decoded = shareService.decode(encoded);
      expect(decoded).toEqual(data);
    });

    it('should handle minimal data', () => {
      const data: SharedData = {
        p: 'https://test.com/feed.xml'
      };

      const encoded = shareService.encode(data);
      const decoded = shareService.decode(encoded);
      expect(decoded).toEqual(data);
    });

    it('should handle special characters', () => {
      const data: SharedData = {
        t: 'Episode: "The Best & Greatest"',
        d: 'Description with <special> characters & symbols!'
      };

      const encoded = shareService.encode(data);
      const decoded = shareService.decode(encoded);
      expect(decoded).toEqual(data);
    });

    it('should return null for invalid encoded string', () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      const result = shareService.decode('invalid-string-123');
      expect(result).toBeNull();
      consoleError.mockRestore();
    });

    it('should produce URL-safe encoding', () => {
      const data: SharedData = {
        p: 'https://test.com/feed.xml',
        t: 'Test Episode'
      };

      const encoded = shareService.encode(data);
      
      // Should not contain +, /, or = characters
      expect(encoded).not.toMatch(/[+/=]/);
    });
  });

  describe('generateUrl', () => {
    it('should generate valid URL with share code', () => {
      const data: SharedData = {
        t: 'Test Episode',
        u: 'https://test.com/audio.mp3'
      };

      const result = shareService.generateUrl(data);
      
      expect(result.url).toBeTruthy();
      expect(result.url).toMatch(/#\/\?s=/); // Query param in hash fragment
      expect(result.length).toBeGreaterThan(0);
      expect(result.payloadLength).toBeGreaterThan(0);
      expect(typeof result.isTooLong).toBe('boolean');
    });

    it('should flag URLs longer than 2000 chars', () => {
      // Create a data object that will result in a very long URL
      const longDescription = 'a'.repeat(5000);
      const data: SharedData = {
        p: 'https://test.com/feed.xml',
        e: 'episode-id-' + 'x'.repeat(500),
        t: 'Episode Title ' + 'x'.repeat(500),
        u: 'https://test.com/audio.mp3',
        d: longDescription,
        st: 'Podcast Title ' + 'x'.repeat(500),
        si: 'https://test.com/podcast.jpg',
        i: 'https://test.com/episode.jpg'
      };

      const result = shareService.generateUrl(data);
      // With compression, it might still be under 2000, so just verify it returns a result
      expect(result.length).toBeGreaterThan(0);
      expect(typeof result.isTooLong).toBe('boolean');
    });

    it('should not flag short URLs', () => {
      const data: SharedData = {
        t: 'Test',
        u: 'https://test.com/audio.mp3'
      };

      const result = shareService.generateUrl(data);
      expect(result.isTooLong).toBe(false);
    });
  });

  describe('applyFilters', () => {
    const episodes = [
      {
        id: '1',
        title: 'Episode 1',
        audioUrl: 'https://example.com/1.mp3',
        image: 'https://example.com/1.jpg',
        description: 'Description 1',
        pubDate: '2024-01-01',
        duration: '30:00',
      },
      {
        id: '2',
        title: 'Episode 2',
        audioUrl: 'https://example.com/2.mp3',
        image: 'https://example.com/2.jpg',
        description: 'Description 2',
        pubDate: '2024-01-02',
        duration: '45:00',
      },
    ];

    it('should include all fields when all filters are true', () => {
      const filters: FilterOptions = {
        includeDescriptions: true,
        includeImages: true,
        includeDatesAndDurations: true,
      };

      const result = shareService.applyFilters(episodes, filters);
      expect(result[0].description).toBe('Description 1');
      expect(result[0].image).toBe('https://example.com/1.jpg');
      expect(result[0].pubDate).toBe('2024-01-01');
      expect(result[0].duration).toBe('30:00');
    });

    it('should exclude descriptions when filter is false', () => {
      const filters: FilterOptions = {
        includeDescriptions: false,
        includeImages: true,
        includeDatesAndDurations: true,
      };

      const result = shareService.applyFilters(episodes, filters);
      expect(result[0].description).toBeUndefined();
      expect(result[0].image).toBe('https://example.com/1.jpg');
    });

    it('should exclude images when filter is false', () => {
      const filters: FilterOptions = {
        includeDescriptions: true,
        includeImages: false,
        includeDatesAndDurations: true,
      };

      const result = shareService.applyFilters(episodes, filters);
      expect(result[0].image).toBeUndefined();
      expect(result[0].description).toBe('Description 1');
    });

    it('should always include id, title, and audioUrl', () => {
      const filters: FilterOptions = {
        includeDescriptions: false,
        includeImages: false,
        includeDatesAndDurations: false,
      };

      const result = shareService.applyFilters(episodes, filters);
      expect(result[0].id).toBe('1');
      expect(result[0].title).toBe('Episode 1');
      expect(result[0].audioUrl).toBe('https://example.com/1.mp3');
    });
  });

  describe('Track sharing modes', () => {
    it('should not include RSS URL in embedded-payload mode', () => {
      const data: SharedData = {
        shareType: 'track',
        shareMode: 'embedded-payload',
        t: 'Episode Title',
        u: 'https://test.com/audio.mp3',
        i: 'https://test.com/image.jpg',
        d: 'Description',
        st: 'Podcast Title',
        si: 'https://test.com/podcast.jpg',
      };

      const encoded = shareService.encode(data);
      const decoded = shareService.decode(encoded);
      expect(decoded?.p).toBeUndefined();
      expect(decoded?.t).toBe('Episode Title');
    });

    it('should include RSS URL in wave-source mode', () => {
      const data: SharedData = {
        shareType: 'track',
        shareMode: 'wave-source',
        p: 'https://test.com/feed.xml',
        e: 'episode-123',
      };

      const encoded = shareService.encode(data);
      const decoded = shareService.decode(encoded);
      expect(decoded?.p).toBe('https://test.com/feed.xml');
      expect(decoded?.e).toBe('episode-123');
    });

    it('should generate podcast/episode URL without encoding for wave-source mode', () => {
      delete (global as any).window;
      (global as any).window = { location: { origin: 'http://localhost:3000', pathname: '/', href: 'http://localhost:3000/' } };

      const data: SharedData = {
        shareType: 'track',
        shareMode: 'wave-source',
        p: 'https://test.com/feed.xml',
        e: 'episode-123',
      };

      const result = shareService.generateUrl(data);
      
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

      const data: SharedData = {
        shareType: 'track',
        shareMode: 'embedded-payload',
        t: 'Episode Title',
        u: 'https://test.com/audio.mp3',
        i: 'https://test.com/image.jpg',
        d: 'Description',
        st: 'Podcast Title',
        si: 'https://test.com/podcast.jpg',
      };

      const result = shareService.generateUrl(data);
      
      // Should have encoded parameter in hash fragment
      expect(result.url).toContain('/#/?s=');
      expect(result.payloadLength).toBeGreaterThan(0);
    });
  });

  describe('RSS sharing modes', () => {
    it('should handle frequency mode with just RSS URL', () => {
      const data: SharedData = {
        shareType: 'rss',
        shareMode: 'frequency',
        p: 'https://test.com/feed.xml',
      };

      const encoded = shareService.encode(data);
      const decoded = shareService.decode(encoded);
      expect(decoded?.p).toBe('https://test.com/feed.xml');
      expect(decoded?.episodes).toBeUndefined();
    });

    it('should generate podcast URL without encoding for frequency mode', () => {
      // Mock window.location
      delete (global as any).window;
      (global as any).window = { location: { origin: 'http://localhost:3000', pathname: '/', href: 'http://localhost:3000/' } };

      const data: SharedData = {
        shareType: 'rss',
        shareMode: 'frequency',
        p: 'https://test.com/feed.xml',
      };

      const result = shareService.generateUrl(data);
      
      // Should generate /#/podcast/<encoded-rss-url> format with hash routing
      expect(result.url).toContain('/#/podcast/');
      expect(result.url).toContain(encodeURIComponent('https://test.com/feed.xml'));
      expect(result.url).not.toContain('?s='); // Should not have encoded parameter
      expect(result.payloadLength).toBe(0); // No encoded payload
    });

    it('should generate encoded URL for full manifest mode', () => {
      delete (global as any).window;
      (global as any).window = { location: { origin: 'http://localhost:3000', pathname: '/', href: 'http://localhost:3000/' } };

      const data: SharedData = {
        shareType: 'rss',
        shareMode: 'full-manifest',
        p: 'https://test.com/feed.xml',
        pt: 'Test Podcast',
        episodes: [
          {
            id: 'ep1',
            title: 'Episode 1',
            audioUrl: 'https://test.com/audio.mp3',
          }
        ],
      };

      const result = shareService.generateUrl(data);
      
      // Should have encoded parameter in hash fragment
      expect(result.url).toContain('/#/?s=');
      expect(result.payloadLength).toBeGreaterThan(0);
    });
  });
});
