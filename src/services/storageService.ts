import { Podcast, PlaybackState, Theme, Episode } from "../types";
import { STORAGE_KEYS } from "../constants";
import { APP_CONSTANTS } from "../constants";

export interface StorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

class LocalStorageAdapter implements StorageAdapter {
  getItem(key: string): string | null {
    return localStorage.getItem(key);
  }

  setItem(key: string, value: string): void {
    localStorage.setItem(key, value);
  }

  removeItem(key: string): void {
    localStorage.removeItem(key);
  }
}

export class StorageService {
  constructor(private storage: StorageAdapter = new LocalStorageAdapter()) {}

  getPodcasts(): Podcast[] {
    const data = this.storage.getItem(STORAGE_KEYS.PODCASTS);
    if (!data) return [];
    try {
      return JSON.parse(data);
    } catch (error) {
      console.warn('Failed to parse stored podcasts, clearing corrupted data', error);
      this.storage.removeItem(STORAGE_KEYS.PODCASTS);
      return [];
    }
  }

  savePodcasts(podcasts: Podcast[]): void {
    this.storage.setItem(STORAGE_KEYS.PODCASTS, JSON.stringify(podcasts));
  }

  getHistory(): Record<string, PlaybackState> {
    const data = this.storage.getItem(STORAGE_KEYS.HISTORY);
    if (!data) return {};
    try {
      return JSON.parse(data);
    } catch (error) {
      console.warn('Failed to parse stored history, clearing corrupted data', error);
      this.storage.removeItem(STORAGE_KEYS.HISTORY);
      return {};
    }
  }

  saveHistory(history: Record<string, PlaybackState>): void {
    this.storage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));
  }

  getTheme(): Theme {
    return (this.storage.getItem(STORAGE_KEYS.THEME) as Theme) || "dark";
  }

  saveTheme(theme: Theme): void {
    this.storage.setItem(STORAGE_KEYS.THEME, theme);
  }

  getQueue(): Episode[] {
    const data = this.storage.getItem(STORAGE_KEYS.QUEUE);
    if (!data) return [];
    try {
      return JSON.parse(data);
    } catch (error) {
      console.warn('Failed to parse stored queue, clearing corrupted data', error);
      this.storage.removeItem(STORAGE_KEYS.QUEUE);
      return [];
    }
  }

  saveQueue(queue: Episode[]): void {
    this.storage.setItem(STORAGE_KEYS.QUEUE, JSON.stringify(queue));
  }

  updatePlayback(
    episode: Episode,
    podcast: Podcast | { title: string },
    currentTime: number,
    duration: number
  ): void {
    const history = this.getHistory();
    const isCompleted =
      duration > 0 &&
      currentTime / duration > APP_CONSTANTS.COMPLETION_THRESHOLD;

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
      audioUrl: episode.audioUrl, // Added for fallback playback support
    };

    this.saveHistory(history);
  }
}

// Export singleton instance for backward compatibility
export const storageService = new StorageService();

// Export factory for testing
export const createStorageService = (adapter: StorageAdapter) =>
  new StorageService(adapter);
