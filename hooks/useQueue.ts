import { useState, useCallback } from 'react';
import { Episode } from '../types';
import { storageService } from '../services/storageService';
import confetti from 'canvas-confetti';

export const useQueue = (initialQueue?: Episode[]) => {
  const [queue, setQueue] = useState<Episode[]>(() => {
    if (initialQueue) return initialQueue;
    return storageService.getQueue();
  });

  const addToQueue = useCallback((episode: Episode) => {
    setQueue(prev => {
      if (prev.some(e => e.id === episode.id)) return prev;
      const updated = [...prev, episode];
      storageService.saveQueue(updated);
      confetti({ particleCount: 15, spread: 30, origin: { y: 0.9 } });
      return updated;
    });
  }, []);

  const removeFromQueue = useCallback((episodeId: string) => {
    setQueue(prev => {
      const updated = prev.filter(e => e.id !== episodeId);
      storageService.saveQueue(updated);
      return updated;
    });
  }, []);

  const clearQueue = useCallback(() => {
    setQueue([]);
    storageService.saveQueue([]);
  }, []);

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
