import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createError,
  logError,
} from '..';
import { AppError, ErrorCategory } from '../../types';

describe('errorHandlers', () => {
  // Mock globals for createError
  beforeEach(() => {
    // Mock navigator
    global.navigator = {
      userAgent: 'Test User Agent',
    } as any;

    // Mock window.location
    global.window = {
      location: {
        href: 'https://example.com/test',
      },
    } as any;
  });

  describe('createError', () => {
    it('should create error with basic info', () => {
      const error = createError('network', 'Connection failed');

      expect(error.category).toBe('network');
      expect(error.message).toBe('Connection failed');
      expect(error.timestamp).toBeGreaterThan(0);
      expect(error.context.userAgent).toBe('Test User Agent');
      expect(error.context.href).toBe('https://example.com/test');
    });

    it('should include error stack when available', () => {
      const originalError = new Error('Original error');
      const error = createError('feed', 'Feed failed', originalError);

      expect(error.details).toContain('Error: Original error');
    });

    it('should include error message when stack not available', () => {
      const originalError = { message: 'Custom error' };
      const error = createError('playback', 'Playback failed', originalError);

      expect(error.details).toBe('Custom error');
    });

    it('should convert non-error objects to string', () => {
      const error = createError('storage', 'Storage failed', 'string error');

      expect(error.details).toBe('string error');
    });

    it('should include context data', () => {
      const context = { podcastId: '123', episodeId: '456' };
      const error = createError('feed', 'Failed', undefined, context);

      expect(error.context.podcastId).toBe('123');
      expect(error.context.episodeId).toBe('456');
    });

    it('should include diagnostics from error object', () => {
      const originalError = {
        message: 'Fetch failed',
        diagnostics: {
          url: 'https://example.com/feed.rss',
          attempts: ['direct', 'proxy1'],
        },
      };
      const error = createError('network', 'Network error', originalError);

      expect(error.context.diagnostics.url).toBe('https://example.com/feed.rss');
      expect(error.context.diagnostics.attempts).toEqual(['direct', 'proxy1']);
    });

    it('should handle all error categories', () => {
      const categories: ErrorCategory[] = ['network', 'feed', 'playback', 'storage', 'cast', 'share'];
      
      categories.forEach(category => {
        const error = createError(category, 'Test error');
        expect(error.category).toBe(category);
      });
    });
  });

  describe('logError', () => {
    beforeEach(() => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should log error to console with category prefix', () => {
      const error: AppError = {
        category: 'network',
        message: 'Connection failed',
        details: 'Timeout',
        timestamp: Date.now(),
        context: {},
      };

      logError(error);

      expect(console.error).toHaveBeenCalledWith(
        '[AuraPod:network]',
        'Connection failed',
        error
      );
    });

    it('should log all error categories correctly', () => {
      const categories: ErrorCategory[] = ['network', 'feed', 'playback', 'storage', 'cast', 'share'];
      
      categories.forEach(category => {
        const error: AppError = {
          category,
          message: 'Test error',
          details: '',
          timestamp: Date.now(),
          context: {},
        };

        logError(error);

        expect(console.error).toHaveBeenCalledWith(
          `[AuraPod:${category}]`,
          'Test error',
          error
        );
      });
    });
  });
});
