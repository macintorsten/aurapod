
export type Theme = 'dark' | 'light' | 'system';

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
}

export interface PlaybackState {
  episodeId: string;
  podcastId: string;
  currentTime: number;
  duration: number;
  lastUpdated: number;
  completed: boolean;
}

export interface AppState {
  podcasts: Podcast[];
  playbackHistory: Record<string, PlaybackState>; // key is episodeId
  currentEpisode?: Episode;
  activePodcastId?: string;
  queue: Episode[];
}
