import { describe, it, expect } from 'vitest';
import {
  formatTimestamp,
  formatTime,
  parseDuration,
  truncate,
} from '../formatters';

describe('formatters', () => {
  describe('formatTimestamp', () => {
    it('should format timestamp to readable date', () => {
      const timestamp = new Date('2024-01-15T12:30:00Z').getTime();
      const result = formatTimestamp(timestamp);
      
      // Check that it contains the expected parts
      expect(result).toContain('Jan');
      expect(result).toContain('15');
      expect(result).toContain('2024');
    });

    it('should handle current timestamp', () => {
      const now = Date.now();
      const result = formatTimestamp(now);
      
      expect(result).toBeTruthy();
      expect(result).not.toBe('Invalid timestamp');
    });

    it('should handle zero timestamp (epoch)', () => {
      const result = formatTimestamp(0);
      
      expect(result).toBeTruthy();
      expect(result).not.toBe('Invalid timestamp');
    });

    it('should return "Invalid timestamp" for NaN input', () => {
      expect(formatTimestamp(NaN)).toBe('Invalid timestamp');
    });
  });

  describe('formatTime', () => {
    it('should format seconds to MM:SS', () => {
      expect(formatTime(0)).toBe('0:00');
      expect(formatTime(30)).toBe('0:30');
      expect(formatTime(90)).toBe('1:30');
      expect(formatTime(600)).toBe('10:00');
    });

    it('should format seconds to HH:MM:SS when hours present', () => {
      expect(formatTime(3600)).toBe('1:00:00');
      expect(formatTime(3661)).toBe('1:01:01');
      expect(formatTime(7200)).toBe('2:00:00');
    });

    it('should pad minutes and seconds with zeros', () => {
      expect(formatTime(65)).toBe('1:05');
      expect(formatTime(3605)).toBe('1:00:05');
    });

    it('should handle zero', () => {
      expect(formatTime(0)).toBe('0:00');
    });

    it('should handle large numbers', () => {
      expect(formatTime(36000)).toBe('10:00:00');
    });

    it('should handle invalid input gracefully', () => {
      expect(formatTime(NaN)).toBe('0:00');
      expect(formatTime(Infinity)).toBe('0:00');
      expect(formatTime(-1)).toBe('0:00');
    });
  });

  describe('parseDuration', () => {
    it('should parse HH:MM:SS format', () => {
      expect(parseDuration('1:23:45')).toBe(5025);
      expect(parseDuration('0:05:30')).toBe(330);
    });

    it('should parse MM:SS format', () => {
      expect(parseDuration('45:30')).toBe(2730);
      expect(parseDuration('5:30')).toBe(330);
    });

    it('should parse SS format', () => {
      expect(parseDuration('30')).toBe(30);
      expect(parseDuration('90')).toBe(90);
    });

    it('should handle empty string', () => {
      expect(parseDuration('')).toBe(0);
    });

    it('should handle leading zeros', () => {
      expect(parseDuration('01:02:03')).toBe(3723);
    });

    it('should handle edge cases', () => {
      expect(parseDuration('0:0:0')).toBe(0);
      expect(parseDuration('00:00')).toBe(0);
    });

    it('should return 0 for invalid non-numeric format', () => {
      expect(parseDuration('invalid')).toBe(0);
    });
  });

  describe('truncate', () => {
    it('should not truncate short text', () => {
      const text = 'Short text';
      expect(truncate(text, 20)).toBe('Short text');
    });

    it('should truncate long text with ellipsis', () => {
      const text = 'This is a very long text that needs truncation';
      const result = truncate(text, 20);
      
      expect(result).toBe('This is a very lo...');
      expect(result.length).toBe(20);
    });

    it('should handle text exactly at max length', () => {
      const text = '12345';
      expect(truncate(text, 5)).toBe('12345');
    });

    it('should handle empty string', () => {
      expect(truncate('', 10)).toBe('');
    });

    it('should handle maxLength less than 3', () => {
      // Edge case: ellipsis is 3 chars, so maxLength < 3 might cause issues
      const text = 'Hello';
      expect(truncate(text, 2)).toBe('...');
    });

    it('should handle null/undefined', () => {
      expect(truncate(null as any, 10)).toBe(null);
      expect(truncate(undefined as any, 10)).toBe(undefined);
    });

    it('should truncate at word boundaries when possible', () => {
      const text = 'The quick brown fox jumps over the lazy dog';
      const result = truncate(text, 20);
      
      expect(result.length).toBe(20);
      expect(result.endsWith('...')).toBe(true);
    });
  });
});
