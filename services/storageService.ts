
import { Podcast, PlaybackState, Theme, Episode } from '../types';

const STORAGE_KEYS = {
  PODCASTS: 'novacast_podcasts',
  HISTORY: 'novacast_history',
  THEME: 'novacast_theme',
  QUEUE: 'novacast_queue',
};

export const storageService = {
  getPodcasts: (): Podcast[] => {
    const data = localStorage.getItem(STORAGE_KEYS.PODCASTS);
    return data ? JSON.parse(data) : [];
  },

  savePodcasts: (podcasts: Podcast[]) => {
    localStorage.setItem(STORAGE_KEYS.PODCASTS, JSON.stringify(podcasts));
  },

  getHistory: (): Record<string, PlaybackState> => {
    const data = localStorage.getItem(STORAGE_KEYS.HISTORY);
    return data ? JSON.parse(data) : {};
  },

  saveHistory: (history: Record<string, PlaybackState>) => {
    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));
  },

  getTheme: (): Theme => {
    return (localStorage.getItem(STORAGE_KEYS.THEME) as Theme) || 'dark';
  },

  saveTheme: (theme: Theme) => {
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
  },

  getQueue: (): Episode[] => {
    const data = localStorage.getItem(STORAGE_KEYS.QUEUE);
    return data ? JSON.parse(data) : [];
  },

  saveQueue: (queue: Episode[]) => {
    localStorage.setItem(STORAGE_KEYS.QUEUE, JSON.stringify(queue));
  },

  updatePlayback: (episodeId: string, podcastId: string, currentTime: number, duration: number) => {
    const history = storageService.getHistory();
    const isCompleted = duration > 0 && (currentTime / duration) > 0.95;
    
    history[episodeId] = {
      episodeId,
      podcastId,
      currentTime,
      duration,
      lastUpdated: Date.now(),
      completed: isCompleted,
    };
    
    storageService.saveHistory(history);
  }
};
