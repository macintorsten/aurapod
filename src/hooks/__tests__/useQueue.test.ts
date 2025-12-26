import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useQueue } from '../useQueue';
import { Episode } from '../../types';

// Mock dependencies
vi.mock('../../services/storageService', () => ({
  storageService: {
    getQueue: vi.fn(() => []),
    saveQueue: vi.fn(),
  },
}));

vi.mock('canvas-confetti', () => ({
  default: vi.fn(),
}));

import { storageService } from '../../services/storageService';
import confetti from 'canvas-confetti';

const mockEpisode1: Episode = {
  id: 'ep1',
  podcastId: 'podcast1',
  title: 'Episode 1',
  audioUrl: 'https://example.com/ep1.mp3',
  duration: '3600',
  pubDate: '2024-01-01',
  description: 'Description 1',
  link: 'https://example.com/ep1',
};

const mockEpisode2: Episode = {
  id: 'ep2',
  podcastId: 'podcast1',
  title: 'Episode 2',
  audioUrl: 'https://example.com/ep2.mp3',
  duration: '1800',
  pubDate: '2024-01-02',
  description: 'Description 2',
  link: 'https://example.com/ep2',
};

const mockEpisode3: Episode = {
  id: 'ep3',
  podcastId: 'podcast1',
  title: 'Episode 3',
  audioUrl: 'https://example.com/ep3.mp3',
  duration: '2400',
  pubDate: '2024-01-03',
  description: 'Description 3',
  link: 'https://example.com/ep3',
};

describe('useQueue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset getQueue to return empty array by default
    (storageService.getQueue as ReturnType<typeof vi.fn>).mockReturnValue([]);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with empty queue by default', () => {
      const { result } = renderHook(() => useQueue());
      
      expect(result.current.queue).toEqual([]);
      expect(storageService.getQueue).toHaveBeenCalledTimes(1);
    });

    it('should initialize with queue from storage', () => {
      const storedQueue = [mockEpisode1, mockEpisode2];
      (storageService.getQueue as ReturnType<typeof vi.fn>).mockReturnValue(storedQueue);

      const { result } = renderHook(() => useQueue());
      
      expect(result.current.queue).toEqual(storedQueue);
      expect(storageService.getQueue).toHaveBeenCalledTimes(1);
    });

    it('should initialize with provided initial queue', () => {
      const initialQueue = [mockEpisode1];
      
      const { result } = renderHook(() => useQueue(initialQueue));
      
      expect(result.current.queue).toEqual(initialQueue);
      expect(storageService.getQueue).not.toHaveBeenCalled();
    });
  });

  describe('addToQueue', () => {
    it('should add an episode to empty queue', () => {
      const { result } = renderHook(() => useQueue());
      
      act(() => {
        result.current.addToQueue(mockEpisode1);
      });
      
      expect(result.current.queue).toEqual([mockEpisode1]);
      expect(storageService.saveQueue).toHaveBeenCalledWith([mockEpisode1]);
    });

    it('should add episode to end of existing queue', () => {
      const { result } = renderHook(() => useQueue([mockEpisode1]));
      
      act(() => {
        result.current.addToQueue(mockEpisode2);
      });
      
      expect(result.current.queue).toEqual([mockEpisode1, mockEpisode2]);
      expect(storageService.saveQueue).toHaveBeenCalledWith([mockEpisode1, mockEpisode2]);
    });

    it('should not add duplicate episode (same id)', () => {
      const { result } = renderHook(() => useQueue([mockEpisode1]));
      
      act(() => {
        result.current.addToQueue(mockEpisode1);
      });
      
      expect(result.current.queue).toEqual([mockEpisode1]);
      expect(storageService.saveQueue).not.toHaveBeenCalled();
    });

    it('should trigger confetti animation on successful add', () => {
      const { result } = renderHook(() => useQueue());
      
      act(() => {
        result.current.addToQueue(mockEpisode1);
      });
      
      expect(confetti).toHaveBeenCalledWith({
        particleCount: 15,
        spread: 30,
        origin: { y: 0.9 },
      });
    });

    it('should not trigger confetti for duplicate episode', () => {
      const { result } = renderHook(() => useQueue([mockEpisode1]));
      
      act(() => {
        result.current.addToQueue(mockEpisode1);
      });
      
      expect(confetti).not.toHaveBeenCalled();
    });
  });

  describe('removeFromQueue', () => {
    it('should remove episode from queue by id', () => {
      const { result } = renderHook(() => useQueue([mockEpisode1, mockEpisode2, mockEpisode3]));
      
      act(() => {
        result.current.removeFromQueue('ep2');
      });
      
      expect(result.current.queue).toEqual([mockEpisode1, mockEpisode3]);
      expect(storageService.saveQueue).toHaveBeenCalledWith([mockEpisode1, mockEpisode3]);
    });

    it('should handle removing first episode', () => {
      const { result } = renderHook(() => useQueue([mockEpisode1, mockEpisode2]));
      
      act(() => {
        result.current.removeFromQueue('ep1');
      });
      
      expect(result.current.queue).toEqual([mockEpisode2]);
    });

    it('should handle removing last episode', () => {
      const { result } = renderHook(() => useQueue([mockEpisode1, mockEpisode2]));
      
      act(() => {
        result.current.removeFromQueue('ep2');
      });
      
      expect(result.current.queue).toEqual([mockEpisode1]);
    });

    it('should handle removing from empty queue', () => {
      const { result } = renderHook(() => useQueue());
      
      act(() => {
        result.current.removeFromQueue('ep1');
      });
      
      expect(result.current.queue).toEqual([]);
      expect(storageService.saveQueue).toHaveBeenCalledWith([]);
    });

    it('should handle removing non-existent episode', () => {
      const { result } = renderHook(() => useQueue([mockEpisode1]));
      
      act(() => {
        result.current.removeFromQueue('nonexistent');
      });
      
      expect(result.current.queue).toEqual([mockEpisode1]);
      expect(storageService.saveQueue).toHaveBeenCalledWith([mockEpisode1]);
    });
  });

  describe('clearQueue', () => {
    it('should clear all episodes from queue', () => {
      const { result } = renderHook(() => useQueue([mockEpisode1, mockEpisode2, mockEpisode3]));
      
      act(() => {
        result.current.clearQueue();
      });
      
      expect(result.current.queue).toEqual([]);
      expect(storageService.saveQueue).toHaveBeenCalledWith([]);
    });

    it('should handle clearing empty queue', () => {
      const { result } = renderHook(() => useQueue());
      
      act(() => {
        result.current.clearQueue();
      });
      
      expect(result.current.queue).toEqual([]);
      expect(storageService.saveQueue).toHaveBeenCalledWith([]);
    });
  });

  describe('playNext', () => {
    it('should return and remove first episode from queue', () => {
      const { result } = renderHook(() => useQueue([mockEpisode1, mockEpisode2, mockEpisode3]));
      
      let nextEpisode: Episode | null = null;
      act(() => {
        nextEpisode = result.current.playNext();
      });
      
      expect(nextEpisode).toEqual(mockEpisode1);
      expect(result.current.queue).toEqual([mockEpisode2, mockEpisode3]);
      expect(storageService.saveQueue).toHaveBeenCalledWith([mockEpisode2, mockEpisode3]);
    });

    it('should return null for empty queue', () => {
      const { result } = renderHook(() => useQueue());
      
      let nextEpisode: Episode | null = null;
      act(() => {
        nextEpisode = result.current.playNext();
      });
      
      expect(nextEpisode).toBeNull();
      expect(result.current.queue).toEqual([]);
    });

    it('should handle single episode queue', () => {
      const { result } = renderHook(() => useQueue([mockEpisode1]));
      
      let nextEpisode: Episode | null = null;
      act(() => {
        nextEpisode = result.current.playNext();
      });
      
      expect(nextEpisode).toEqual(mockEpisode1);
      expect(result.current.queue).toEqual([]);
      expect(storageService.saveQueue).toHaveBeenCalledWith([]);
    });

    it('should allow multiple sequential playNext calls', () => {
      const { result } = renderHook(() => useQueue([mockEpisode1, mockEpisode2, mockEpisode3]));
      
      let first: Episode | null = null;
      let second: Episode | null = null;
      let third: Episode | null = null;
      let fourth: Episode | null = null;

      act(() => {
        first = result.current.playNext();
      });
      act(() => {
        second = result.current.playNext();
      });
      act(() => {
        third = result.current.playNext();
      });
      act(() => {
        fourth = result.current.playNext();
      });
      
      expect(first).toEqual(mockEpisode1);
      expect(second).toEqual(mockEpisode2);
      expect(third).toEqual(mockEpisode3);
      expect(fourth).toBeNull();
      expect(result.current.queue).toEqual([]);
    });
  });

  describe('integration scenarios', () => {
    it('should handle add, remove, and playNext in sequence', () => {
      const { result } = renderHook(() => useQueue());
      
      // Add episodes
      act(() => {
        result.current.addToQueue(mockEpisode1);
        result.current.addToQueue(mockEpisode2);
        result.current.addToQueue(mockEpisode3);
      });
      
      expect(result.current.queue).toHaveLength(3);
      
      // Remove middle episode
      act(() => {
        result.current.removeFromQueue('ep2');
      });
      
      expect(result.current.queue).toEqual([mockEpisode1, mockEpisode3]);
      
      // Play next
      let next: Episode | null = null;
      act(() => {
        next = result.current.playNext();
      });
      
      expect(next).toEqual(mockEpisode1);
      expect(result.current.queue).toEqual([mockEpisode3]);
    });

    it('should persist queue state through operations', () => {
      const { result } = renderHook(() => useQueue());
      
      act(() => {
        result.current.addToQueue(mockEpisode1);
      });
      
      expect(storageService.saveQueue).toHaveBeenCalledWith([mockEpisode1]);
      
      act(() => {
        result.current.addToQueue(mockEpisode2);
      });
      
      expect(storageService.saveQueue).toHaveBeenCalledWith([mockEpisode1, mockEpisode2]);
      
      act(() => {
        result.current.playNext();
      });
      
      expect(storageService.saveQueue).toHaveBeenCalledWith([mockEpisode2]);
    });
  });
});
