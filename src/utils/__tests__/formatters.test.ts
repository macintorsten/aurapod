import { describe, it, expect } from 'vitest';
import {
  formatTimestamp,
  formatTime,
} from '..';

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
});
