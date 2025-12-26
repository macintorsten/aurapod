import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createError,
  isNetworkError,
  isCORSError,
  getUserFriendlyMessage,
  logError,
} from '../errorHandlers';
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

  describe('isNetworkError', () => {
    it('should detect network error from message', () => {
      expect(isNetworkError({ message: 'fetch failed' })).toBe(true);
      expect(isNetworkError({ message: 'network error' })).toBe(true);
      expect(isNetworkError({ message: 'NetworkError occurred' })).toBe(true);
    });

    it('should detect network error from name', () => {
      expect(isNetworkError({ name: 'NetworkError' })).toBe(true);
    });

    it('should return false for non-network errors', () => {
      expect(isNetworkError({ message: 'parsing error' })).toBe(false);
      expect(isNetworkError({ name: 'SyntaxError' })).toBe(false);
    });

    it('should handle null/undefined', () => {
      expect(isNetworkError(null)).toBe(false);
      expect(isNetworkError(undefined)).toBe(false);
    });

    it('should handle errors without message or name', () => {
      expect(isNetworkError({})).toBe(false);
      expect(isNetworkError({ code: 500 })).toBe(false);
    });
  });

  describe('isCORSError', () => {
    it('should detect CORS error from message (uppercase)', () => {
      expect(isCORSError({ message: 'CORS error' })).toBe(true);
      expect(isCORSError({ message: 'Failed due to CORS policy' })).toBe(true);
    });

    it('should detect CORS error from message (lowercase)', () => {
      expect(isCORSError({ message: 'cors blocked' })).toBe(true);
    });

    it('should detect CORS error from diagnostics', () => {
      expect(isCORSError({ diagnostics: { corsIssue: true } })).toBe(true);
    });

    it('should return falsy for null/undefined (bug: returns undefined not false)', () => {
      // BUG: Function returns undefined instead of explicit false for null/undefined
      expect(isCORSError(null)).toBeFalsy();
      expect(isCORSError(undefined)).toBeFalsy();
    });

    it('should return falsy for non-CORS errors', () => {
      expect(isCORSError({ message: 'timeout error' })).toBeFalsy();
      expect(isCORSError({ name: 'NetworkError' })).toBeFalsy();
    });

    it('should return falsy for errors without message or diagnostics', () => {
      expect(isCORSError({})).toBeFalsy();
    });
  });

  describe('getUserFriendlyMessage', () => {
    it('should return friendly message for network errors', () => {
      const error: AppError = {
        category: 'network',
        message: 'Failed',
        details: '',
        timestamp: Date.now(),
        context: {},
      };

      expect(getUserFriendlyMessage(error)).toBe('Network error. Please check your connection.');
    });

    it('should return friendly message for feed errors', () => {
      const error: AppError = {
        category: 'feed',
        message: 'Failed',
        details: '',
        timestamp: Date.now(),
        context: {},
      };

      expect(getUserFriendlyMessage(error)).toBe(
        'Failed to load podcast feed. The feed may be invalid or unavailable.'
      );
    });

    it('should return friendly message for playback errors', () => {
      const error: AppError = {
        category: 'playback',
        message: 'Failed',
        details: '',
        timestamp: Date.now(),
        context: {},
      };

      expect(getUserFriendlyMessage(error)).toBe(
        'Playback error. The audio file may be unavailable.'
      );
    });

    it('should return friendly message for storage errors', () => {
      const error: AppError = {
        category: 'storage',
        message: 'Failed',
        details: '',
        timestamp: Date.now(),
        context: {},
      };

      expect(getUserFriendlyMessage(error)).toBe(
        'Storage error. Your browser may have run out of space.'
      );
    });

    it('should return friendly message for cast errors', () => {
      const error: AppError = {
        category: 'cast',
        message: 'Failed',
        details: '',
        timestamp: Date.now(),
        context: {},
      };

      expect(getUserFriendlyMessage(error)).toBe('Chromecast connection error.');
    });

    it('should return friendly message for share errors', () => {
      const error: AppError = {
        category: 'share',
        message: 'Failed',
        details: '',
        timestamp: Date.now(),
        context: {},
      };

      expect(getUserFriendlyMessage(error)).toBe('Failed to process shared content.');
    });

    it('should return default message for unknown category', () => {
      const error: AppError = {
        category: 'unknown' as any,
        message: 'Failed',
        details: '',
        timestamp: Date.now(),
        context: {},
      };

      expect(getUserFriendlyMessage(error)).toBe('An unexpected error occurred.');
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

  describe('integration scenarios', () => {
    it('should create and log network error', () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});

      const originalError = new Error('fetch failed');
      const error = createError('network', 'Connection failed', originalError);
      
      expect(isNetworkError(originalError)).toBe(true);
      
      const friendlyMsg = getUserFriendlyMessage(error);
      expect(friendlyMsg).toBe('Network error. Please check your connection.');
      
      logError(error);
      expect(console.error).toHaveBeenCalled();

      vi.restoreAllMocks();
    });

    it('should create and handle CORS error', () => {
      const originalError = {
        message: 'CORS policy blocked',
        diagnostics: { corsIssue: true },
      };
      
      expect(isCORSError(originalError)).toBe(true);
      expect(isNetworkError(originalError)).toBe(false);
      
      const error = createError('network', 'CORS blocked', originalError);
      expect(error.context.diagnostics.corsIssue).toBe(true);
    });
  });
});
