
export type Theme = 'dark' | 'light' | 'system';

export type ErrorCategory = 'network' | 'parsing' | 'playback' | 'system' | 'feed' | 'storage' | 'cast' | 'share';

export interface AppError {
  category: ErrorCategory;
  message: string;
  details?: string;
  timestamp: number;
  context?: any;
}

export interface Podcast {
  id: string;
  title: string;
  description: string;
  image: string;
  feedUrl: string;
  author: string;
  category?: string;
}

export interface Episode {
  id: string;
  podcastId: string;
  title: string;
  description: string;
  pubDate: string;
  audioUrl: string;
  duration: string;
  link: string;
  image?: string;
  // Contextual info for unified views
  podcastTitle?: string;
  podcastImage?: string;
}

export interface PlaybackState {
  episodeId: string;
  podcastId: string;
  currentTime: number;
  duration: number;
  lastUpdated: number;
  completed: boolean;
  // Snapshot data for history persistence
  title?: string;
  image?: string;
  podcastTitle?: string;
  description?: string;
  pubDate?: string;
  audioUrl?: string; // Critical for playing from history if podcast is unsubscribed
}

export interface AppState {
  podcasts: Podcast[];
  playbackHistory: Record<string, PlaybackState>; // key is episodeId
  currentEpisode?: Episode;
  activePodcastId?: string;
  queue: Episode[];
}
