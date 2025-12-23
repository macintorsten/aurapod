import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createStorageService, StorageAdapter } from '../storageService';
import { Podcast, Episode } from '../../types';

describe('StorageService', () => {
  let mockStorage: StorageAdapter;
  let service: ReturnType<typeof createStorageService>;

  beforeEach(() => {
    const storage = new Map<string, string>();
    mockStorage = {
      getItem: vi.fn((key: string) => storage.get(key) || null),
      setItem: vi.fn((key: string, value: string) => storage.set(key, value)),
      removeItem: vi.fn((key: string) => storage.delete(key)),
    };
    service = createStorageService(mockStorage);
  });

  describe('Podcasts', () => {
    it('should save and retrieve podcasts', () => {
      const podcasts: Podcast[] = [
        { 
          id: '1', 
          title: 'Test Podcast', 
          feedUrl: 'https://test.com/feed', 
          image: 'https://test.com/image.jpg', 
          author: 'Test Author', 
          description: 'A test podcast' 
        }
      ];
      
      service.savePodcasts(podcasts);
      const retrieved = service.getPodcasts();
      
      expect(retrieved).toEqual(podcasts);
      expect(mockStorage.setItem).toHaveBeenCalledWith(
        'aurapod_podcasts', 
        JSON.stringify(podcasts)
      );
    });

    it('should return empty array when no podcasts stored', () => {
      const podcasts = service.getPodcasts();
      expect(podcasts).toEqual([]);
    });
  });

  describe('History', () => {
    it('should save and retrieve playback history', () => {
      const history = {
        'episode-1': {
          episodeId: 'episode-1',
          podcastId: 'podcast-1',
          currentTime: 120,
          duration: 600,
          lastUpdated: Date.now(),
          completed: false,
          title: 'Test Episode',
          image: 'https://test.com/image.jpg',
          podcastTitle: 'Test Podcast',
          description: 'Test description',
          pubDate: '2023-01-01',
          audioUrl: 'https://test.com/audio.mp3'
        }
      };
      
      service.saveHistory(history);
      const retrieved = service.getHistory();
      
      expect(retrieved).toEqual(history);
    });

    it('should return empty object when no history stored', () => {
      const history = service.getHistory();
      expect(history).toEqual({});
    });

    it('should update playback and mark as completed when progress > 95%', () => {
      const episode: Episode = {
        id: 'ep-1',
        podcastId: 'pod-1',
        title: 'Episode 1',
        description: 'Test',
        audioUrl: 'https://test.com/audio.mp3',
        duration: '10m',
        pubDate: '2023-01-01',
        link: '',
      };

      const podcast = { title: 'Test Podcast', image: 'https://test.com/img.jpg' };

      // 96% progress should mark as completed
      service.updatePlayback(episode, podcast, 576, 600);
      
      const history = service.getHistory();
      expect(history['ep-1'].completed).toBe(true);
      expect(history['ep-1'].currentTime).toBe(576);
    });

    it('should update playback and not mark as completed when progress < 95%', () => {
      const episode: Episode = {
        id: 'ep-2',
        podcastId: 'pod-1',
        title: 'Episode 2',
        description: 'Test',
        audioUrl: 'https://test.com/audio.mp3',
        duration: '10m',
        pubDate: '2023-01-01',
        link: '',
      };

      const podcast = { title: 'Test Podcast', image: 'https://test.com/img.jpg' };

      // 50% progress should not mark as completed
      service.updatePlayback(episode, podcast, 300, 600);
      
      const history = service.getHistory();
      expect(history['ep-2'].completed).toBe(false);
    });
  });

  describe('Theme', () => {
    it('should save and retrieve theme', () => {
      service.saveTheme('light');
      const theme = service.getTheme();
      expect(theme).toBe('light');
    });

    it('should return default theme when none stored', () => {
      const theme = service.getTheme();
      expect(theme).toBe('dark');
    });
  });

  describe('Queue', () => {
    it('should save and retrieve queue', () => {
      const queue: Episode[] = [
        {
          id: 'ep-1',
          podcastId: 'pod-1',
          title: 'Episode 1',
          description: 'Test',
          audioUrl: 'https://test.com/audio.mp3',
          duration: '10m',
          pubDate: '2023-01-01',
          link: '',
        }
      ];
      
      service.saveQueue(queue);
      const retrieved = service.getQueue();
      
      expect(retrieved).toEqual(queue);
    });

    it('should return empty array when no queue stored', () => {
      const queue = service.getQueue();
      expect(queue).toEqual([]);
    });
  });
});
