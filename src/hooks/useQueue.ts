import { useState, useCallback } from 'react';
import { Episode } from '../types';
import { storageService } from '../services/storageService';
import confetti from 'canvas-confetti';

/**
 * Hook for managing the episode queue with localStorage persistence
 * @param initialQueue - Optional initial queue state (defaults to stored queue)
 * @returns Queue state and management functions
 */
export const useQueue = (initialQueue?: Episode[]) => {
  const [queue, setQueue] = useState<Episode[]>(() => {
    if (initialQueue) return initialQueue;
    return storageService.getQueue();
  });

  /**
   * Add an episode to the end of the queue (prevents duplicates)
   * Triggers confetti animation on success
   * @param episode - Episode to add to queue
   */
  const addToQueue = useCallback((episode: Episode) => {
    setQueue(prev => {
      if (prev.some(e => e.id === episode.id)) return prev;
      const updated = [...prev, episode];
      storageService.saveQueue(updated);
      confetti({ particleCount: 15, spread: 30, origin: { y: 0.9 } });
      return updated;
    });
  }, []);

  /**
   * Remove an episode from the queue by ID
   * @param episodeId - ID of episode to remove
   */
  const removeFromQueue = useCallback((episodeId: string) => {
    setQueue(prev => {
      const updated = prev.filter(e => e.id !== episodeId);
      storageService.saveQueue(updated);
      return updated;
    });
  }, []);

  /**
   * Clear all episodes from the queue
   */
  const clearQueue = useCallback(() => {
    setQueue([]);
    storageService.saveQueue([]);
  }, []);

  /**
   * Play the next episode in queue (removes from front and returns it)
   * @returns The next episode, or null if queue is empty
   */
  const playNext = useCallback(() => {
    if (queue.length === 0) return null;
    const [nextEpisode, ...updated] = queue;
    setQueue(updated);
    storageService.saveQueue(updated);
    return nextEpisode;
  }, [queue]);

  return {
    queue,
    addToQueue,
    removeFromQueue,
    clearQueue,
    playNext,
  };
};
