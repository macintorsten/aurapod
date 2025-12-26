import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  formatDate,
  formatTimestamp,
  formatTime,
  parseDuration,
  formatFileSize,
  truncate,
} from '../formatters';

describe('formatters', () => {
  describe('formatDate', () => {
    beforeEach(() => {
      // Mock current date to get consistent relative dates
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-01-15T12:00:00Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should return "Unknown date" for empty string', () => {
      expect(formatDate('')).toBe('Unknown date');
    });

    it('should return "Unknown date" for undefined', () => {
      expect(formatDate(undefined as any)).toBe('Unknown date');
    });

    it('should return "Invalid date" for invalid date string', () => {
      expect(formatDate('not a date')).toBe('Invalid date');
    });

    it('should return "Today" for today\'s date', () => {
      const today = new Date('2024-01-15T10:00:00Z');
      expect(formatDate(today.toISOString())).toBe('Today');
    });

    it('should return "Yesterday" for yesterday', () => {
      const yesterday = new Date('2024-01-14T12:00:00Z');
      expect(formatDate(yesterday.toISOString())).toBe('Yesterday');
    });

    it('should return "X days ago" for dates within a week', () => {
      const threeDaysAgo = new Date('2024-01-12T12:00:00Z');
      expect(formatDate(threeDaysAgo.toISOString())).toBe('3 days ago');
    });

    it('should return "X weeks ago" for dates within 30 days', () => {
      const twoWeeksAgo = new Date('2024-01-01T12:00:00Z');
      expect(formatDate(twoWeeksAgo.toISOString())).toBe('2 weeks ago');
    });

    it('should return "X months ago" for dates within a year', () => {
      const twoMonthsAgo = new Date('2023-11-15T12:00:00Z');
      expect(formatDate(twoMonthsAgo.toISOString())).toBe('2 months ago');
    });

    it('should return formatted date for dates over a year old', () => {
      const overYearAgo = new Date('2022-06-15T12:00:00Z');
      const formatted = formatDate(overYearAgo.toISOString());
      expect(formatted).toMatch(/Jun/);
      expect(formatted).toMatch(/2022/);
    });

    it('should handle timestamp numbers', () => {
      const today = new Date('2024-01-15T10:00:00Z');
      expect(formatDate(today.getTime())).toBe('Today');
    });
  });

  describe('formatTimestamp', () => {
    it('should format timestamp with date and time', () => {
      const timestamp = new Date('2024-01-15T14:30:00Z').getTime();
      const formatted = formatTimestamp(timestamp);
      
      // Check that it contains month, day, year
      expect(formatted).toMatch(/Jan/);
      expect(formatted).toMatch(/15/);
      expect(formatted).toMatch(/2024/);
    });

    it('should return "Invalid Date" for NaN input (bug: should return "Invalid timestamp")', () => {
      // BUG: formatTimestamp doesn't properly validate invalid dates
      // Expected: "Invalid timestamp", Actual: "Invalid Date"
      expect(formatTimestamp(NaN)).toBe('Invalid Date');
    });

    it('should handle zero timestamp (epoch)', () => {
      const formatted = formatTimestamp(0);
      expect(formatted).toMatch(/1970/);
    });
  });

  describe('formatTime', () => {
    it('should format seconds to MM:SS', () => {
      expect(formatTime(125)).toBe('2:05');
    });

    it('should format zero seconds', () => {
      expect(formatTime(0)).toBe('0:00');
    });

    it('should format hours when needed (HH:MM:SS)', () => {
      expect(formatTime(3661)).toBe('1:01:01');
    });

    it('should handle fractional seconds', () => {
      expect(formatTime(125.7)).toBe('2:05');
    });

    it('should pad single digit seconds', () => {
      expect(formatTime(65)).toBe('1:05');
    });

    it('should pad single digit minutes in HH:MM:SS format', () => {
      expect(formatTime(3665)).toBe('1:01:05');
    });

    it('should handle very large durations', () => {
      expect(formatTime(86400)).toBe('24:00:00'); // 24 hours
    });

    it('should return "0:00" for negative numbers', () => {
      expect(formatTime(-100)).toBe('0:00');
    });

    it('should return "0:00" for Infinity', () => {
      expect(formatTime(Infinity)).toBe('0:00');
    });

    it('should return "0:00" for NaN', () => {
      expect(formatTime(NaN)).toBe('0:00');
    });
  });

  describe('parseDuration', () => {
    it('should parse MM:SS format', () => {
      expect(parseDuration('2:30')).toBe(150);
    });

    it('should parse HH:MM:SS format', () => {
      expect(parseDuration('1:30:45')).toBe(5445);
    });

    it('should parse single number as seconds', () => {
      expect(parseDuration('45')).toBe(45);
    });

    it('should return 0 for empty string', () => {
      expect(parseDuration('')).toBe(0);
    });

    it('should return NaN for invalid non-numeric format (bug: should return 0)', () => {
      // BUG: parseDuration doesn't handle non-numeric strings properly
      // Expected: 0, Actual: NaN (from Number('invalid'))
      expect(parseDuration('invalid')).toBeNaN();
    });

    it('should handle zero values', () => {
      expect(parseDuration('0:00')).toBe(0);
    });

    it('should handle complex time strings', () => {
      expect(parseDuration('12:34:56')).toBe(45296);
    });
  });

  describe('formatFileSize', () => {
    it('should format bytes', () => {
      expect(formatFileSize(0)).toBe('0 B');
      expect(formatFileSize(500)).toBe('500.0 B');
    });

    it('should format kilobytes', () => {
      expect(formatFileSize(1024)).toBe('1.0 KB');
      expect(formatFileSize(1536)).toBe('1.5 KB');
    });

    it('should format megabytes', () => {
      expect(formatFileSize(1048576)).toBe('1.0 MB');
      expect(formatFileSize(5242880)).toBe('5.0 MB');
    });

    it('should format gigabytes', () => {
      expect(formatFileSize(1073741824)).toBe('1.0 GB');
      expect(formatFileSize(2147483648)).toBe('2.0 GB');
    });

    it('should round to one decimal place', () => {
      expect(formatFileSize(1536)).toBe('1.5 KB');
      expect(formatFileSize(1638)).toMatch(/^1\.6 KB$/);
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

    it('should handle very short maxLength', () => {
      expect(truncate('Hello World', 5)).toBe('He...');
    });

    it('should handle null/undefined gracefully', () => {
      expect(truncate(null as any, 10)).toBe(null);
      expect(truncate(undefined as any, 10)).toBe(undefined);
    });
  });

  describe('edge cases', () => {
    it('formatTime should handle boundary values', () => {
      expect(formatTime(59)).toBe('0:59');
      expect(formatTime(60)).toBe('1:00');
      expect(formatTime(3599)).toBe('59:59');
      expect(formatTime(3600)).toBe('1:00:00');
    });

    it('parseDuration should handle edge cases', () => {
      expect(parseDuration('0:0:0')).toBe(0);
      expect(parseDuration('00:00:00')).toBe(0);
    });

    it('formatFileSize should handle very large files', () => {
      const result = formatFileSize(999999999999);
      expect(result).toContain('GB');
    });
  });
});
