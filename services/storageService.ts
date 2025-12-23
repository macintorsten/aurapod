
import { Podcast, PlaybackState, Theme, Episode } from '../types';

const STORAGE_KEYS = {
  PODCASTS: 'aurapod_podcasts',
  HISTORY: 'aurapod_history',
  THEME: 'aurapod_theme',
  QUEUE: 'aurapod_queue',
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

  updatePlayback: (episode: Episode, podcast: Podcast | { title: string }, currentTime: number, duration: number) => {
    const history = storageService.getHistory();
    const isCompleted = duration > 0 && (currentTime / duration) > 0.95;
    
    history[episode.id] = {
      episodeId: episode.id,
      podcastId: episode.podcastId,
      currentTime,
      duration,
      lastUpdated: Date.now(),
      completed: isCompleted,
      // Save snapshot so history is useful even if feed is gone
      title: episode.title,
      image: episode.image || (podcast as Podcast).image,
      podcastTitle: podcast.title,
      description: episode.description,
      pubDate: episode.pubDate,
      audioUrl: episode.audioUrl // Added for fallback playback support
    };
    
    storageService.saveHistory(history);
  }
};
